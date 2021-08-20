extern crate scylla;
extern crate tokio;
use futures::stream::StreamExt;
use std::error::Error;
use scylla::transport::session::Session;
use scylla::prepared_statement::PreparedStatement;
use scylla::macros::FromRow;
use scylla::frame::response::cql_to_rust::FromRow;
use uuid::Uuid;
use std::fmt;

fn _print_type_of<T>(_: &T) {
    println!("{}", std::any::type_name::<T>())
}

#[derive(Clone)]
pub enum ResourceKind {
    Node,
    Workload,
    Container,
    Action
}

#[derive(FromRow, Debug, Clone)]
pub struct ResourceSchema {
    pub kind: String, 
    pub name: String,    
    pub id: Uuid, 
    pub meta: Option<String>,
    pub desired: String,
    pub observed: Option<String>, 
    pub computed: Option<String>,
    pub resource: Option<String>,
    pub resource_hash: Option<String>
} 


#[derive(FromRow, Debug, Clone)]
pub struct ZonedResourceSchema {
    pub kind: String, 
    pub zone: String,
    pub name: String,
    pub id: Uuid, 
    pub meta: Option<String>,
    pub desired: String,
    pub observed: Option<String>, 
    pub computed: Option<String>,
    pub resource: Option<String>,
    pub resource_hash: Option<String>
}

#[derive(FromRow, Debug, Clone)]
pub struct WorkspacedResourceSchema {
    pub kind: String, 
    pub workspace: String,
    pub name: String,
    pub id: Uuid, 
    pub meta: Option<String>,
    pub desired: String,
    pub observed: Option<String>, 
    pub computed: Option<String>,
    pub resource: Option<String>,
    pub resource_hash: Option<String>
}

#[derive(FromRow, Debug, Clone)]
pub struct ZonedWorkspacedResourceSchema {
    pub kind: String, 
    pub zone: String,
    pub workspace: String,
    pub name: String,
    pub id: Uuid, 
    pub meta: Option<String>,
    pub desired: String,
    pub observed: Option<String>, 
    pub computed: Option<String>,
    pub resource: Option<String>,
    pub resource_hash: Option<String>,
    pub owner: Option<String>,
    pub insdate: Option<chrono::Duration>
    
}

#[derive(FromRow, Debug, Clone)]
pub struct ContainerSchema {
    pub kind: String,
    pub zone: String,
    pub workspace: String,
    pub name: String,
    pub id: Uuid, 
    pub workload_id: Uuid, 
    pub node_id: Option<Uuid>, 
    pub meta: Option<String>, 
    pub desired: String, 
    pub observed: Option<String>,  
    pub computed: Option<String>, 
    pub resource: Option<String>, 
    pub resource_hash: Option<String>,
    pub owner: Option<String>,
    pub insdate: Option<chrono::Duration>
}

#[derive(FromRow, Debug, Clone, Eq, Ord, PartialEq, PartialOrd)]
pub struct ActionSchema { 
    pub zone: String,    
    pub id: Uuid, 
    pub resource_kind: String,
    pub resource_pk: String, 
    pub action_type: String,
    pub origin: String,
    pub destination: String,
    pub insdate: String
} 

pub struct Crud {
    session: Box<Session>,
    keyspace: String
}

#[allow(dead_code)]
impl Crud  {

    // Public methods
    pub fn 
    new(session_to_use: Box<Session>) 
    -> Crud  
    {
        Crud{session: session_to_use, keyspace: "default".to_string()}
    }

    pub async fn 
    init_keyspace_if_not_exist(&self, keyspace: &str) 
    -> Result<(), Box<dyn Error>> 
    {
        let init_str = format!(
            "{}{}{}", "CREATE KEYSPACE IF NOT EXISTS " , 
            keyspace, 
            " WITH REPLICATION = {'class' : 'SimpleStrategy', 'replication_factor' : 1}" );
    
        self.session.query(init_str,  &[], ).await?;
        Ok(())
    }

    pub fn 
    set_session(&mut self, session_box: Box<Session>) 
    {
        self.session = session_box;
    }

    pub async fn 
    use_keyspace(&mut self, keyspace: &str) 
    -> Result<(), Box<dyn Error>> 
    {
        self.keyspace = keyspace.to_string().clone();
        self.session.use_keyspace(&self.keyspace, false).await?;
        Ok(())
    }

    pub async fn 
    read<T: FromRow + fmt::Debug>(&self, kind: &ResourceKind, query_args: Option<&String>)  
    -> Result<Box<Vec<T>>, Box<dyn Error>> 
    {    
        let mut rows_vec = Box::new(Vec::new());
        let table_name = Crud::kind_to_table(kind);
        let columns_for = Crud::columns_for_table(&table_name); 
        let mut query = format!("{}{}{}{}{}{}{}", 
            "SELECT ", columns_for, " FROM ", table_name,
            " WHERE kind='", Crud::kind_to_string(kind), "'");

        if query_args.is_some() {
            query = format!("{}{}", query, query_args.unwrap());
        }
     
        let mut prepared: PreparedStatement = self.session.prepare(query).await?;   
        prepared.set_page_size(1000);     
        let mut rows_stream = self.session.execute_iter(prepared, &[]).await?.into_typed::<T>();
    
        while let Some(next_row_res) = rows_stream.next().await {
            let row = next_row_res?; 
            rows_vec.push(row);
        }    
        Ok(rows_vec)
    }  
    

    // resource_kind: 'container',
    // destination: 'replica-controller'
    pub async fn 
    read_actions<T: FromRow + fmt::Debug>(&self, zone: &str, resource_kind: &str, destination: &str)  
    -> Result<Box<Vec<T>>, Box<dyn Error>> 
    {    
        let mut rows_vec = Box::new(Vec::new());
        let table_name = "actions".to_string();
        let columns_for = Crud::columns_for_table(&table_name); 
        let query = format!("{}{}{}{}{}{}{}{}{}{}{}", 
            "SELECT ", columns_for, " FROM ", table_name,
            " WHERE zone='", zone, 
            "' AND resource_kind='", resource_kind ,
            "' AND destination='", destination ,"'");
                
        let mut prepared: PreparedStatement = self.session.prepare(query).await?;   
        prepared.set_page_size(1000);     
        let mut rows_stream = self.session.execute_iter(prepared, &[]).await?.into_typed::<T>();
    
        while let Some(next_row_res) = rows_stream.next().await {
            let row = next_row_res?; 
            rows_vec.push(row);
        }    
        Ok(rows_vec)
    }    

    pub async fn 
    delete_action(&self, zone: &str, resource_kind: &str, destination: &str, id: Uuid)  
    -> Result<(), Box<dyn Error>> 
    {    
        let query = "DELETE FROM actions WHERE zone=? AND resource_kind=? AND destination=? AND id=?".to_string();                
        let prepared: PreparedStatement = self.session.prepare(query).await?;    
        self.session.execute(&prepared, (zone, resource_kind, destination, id)).await?;        
        Ok(())
    }    
    
    pub async fn 
    update_workload_observed(&self, observed: &str, zone: &str, workspace: &str, name: &str)  
    -> Result<(), Box<dyn Error>> 
    {
        let query = format!("UPDATE zoned_workspaced_resources SET observed=? WHERE kind='workload' AND zone=? AND workspace=? AND name=?");        
        let prepared: PreparedStatement = self.session.prepare(query).await?;        
        self.session.execute(&prepared, (
            observed,
            zone,
            workspace,
            name
        )).await?;
        Ok(())
    }        
    
    pub async fn 
    delete_workload(&self, zone: &str, workspace: &str, name: &str)  
    -> Result<(), Box<dyn Error>> 
    {    
        let query = "DELETE FROM zoned_workspaced_resources WHERE kind='workload' AND zone=? AND workspace=? AND name=?".to_string();                
        let prepared: PreparedStatement = self.session.prepare(query).await?;    
        self.session.execute(&prepared, (zone, workspace, name)).await?;        
        Ok(())
    }   

    pub async fn 
    delete_container(&self, zone: &str, workspace: &str, name: &str)  
    -> Result<(), Box<dyn Error>> 
    {    
        let query = "DELETE FROM containers WHERE kind='container' AND zone=? AND workspace=? AND name=?".to_string();                
        let prepared: PreparedStatement = self.session.prepare(query).await?;    
        self.session.execute(&prepared, (zone, workspace, name)).await?;        
        Ok(())
    }        
    
    pub async fn 
    get_containers_by_workload_id<T: FromRow + fmt::Debug>(&self, workload_id: &Uuid)  
    -> Result<Box<Vec<T>>, Box<dyn Error>> 
    {
        let mut rows_vec: Box<Vec<T>> = Box::new(Vec::new());
        let table_name = "containers".to_string();
        let columns_for = Crud::columns_for_table(&table_name); 

        let query = format!("{}{}{}{}{}{}", 
            "SELECT ", columns_for, " FROM ", table_name,
            " WHERE workload_id=", workload_id);
  
        let mut prepared: PreparedStatement = self.session.prepare(query).await?;   
        prepared.set_page_size(100);     
        let mut rows_stream = self.session.execute_iter(prepared, &[]).await?.into_typed::<T>();
        
        while let Some(next_row_res) = rows_stream.next().await {
            let row = next_row_res?; 
            rows_vec.push(row);
        }    
        Ok(rows_vec)
    }

    pub async fn 
    get_containers_by_node_id<T: FromRow + fmt::Debug>(&self, node_id: &Uuid)  
    -> Result<Box<Vec<T>>, Box<dyn Error>> 
    {
        let mut rows_vec = Box::new(Vec::new());
        let table_name = "containers".to_string();
        let columns_for = Crud::columns_for_table(&table_name); 
        
        let query = format!("{}{}{}{}{}{}", 
            "SELECT ", columns_for, " FROM ", table_name,
            " WHERE node_id=", node_id);
                
        let mut prepared: PreparedStatement = self.session.prepare(query).await?;   
        prepared.set_page_size(100);     
        let mut rows_stream = self.session.execute_iter(prepared, &[]).await?.into_typed::<T>();
        
        while let Some(next_row_res) = rows_stream.next().await {
            let row = next_row_res?; 
            
            rows_vec.push(row);
        }    
        Ok(rows_vec)
    }    

    pub async fn 
    get_nodes_subset<T: FromRow + fmt::Debug>(&self)  
    -> Result<Box<Vec<T>>, Box<dyn Error>> 
    {
        let mut rows_vec = Box::new(Vec::new());
        let table_name = "zoned_resources".to_string();
        let columns_for = Crud::columns_for_table(&table_name); 
        let query = format!("{}{}{}{}", 
            "SELECT ", columns_for, " FROM ", table_name);
                
        let mut prepared: PreparedStatement = self.session.prepare(query).await?;   
        prepared.set_page_size(100);      
        let mut rows_stream = self.session.execute_iter(prepared, &[]).await?.into_typed::<T>();
        
        while let Some(next_row_res) = rows_stream.next().await {
            let row = next_row_res?; 
            
            rows_vec.push(row);
        }    
        Ok(rows_vec)
    }   
   
    pub async fn 
    insert_container(&self, container: &ContainerSchema)  
    -> Result<(), Box<dyn Error>> 
    {
        let query = format!("INSERT INTO containers (kind, zone, workspace, name, id, workload_id, node_id, desired, computed, resource, resource_hash, owner, insdate) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?, toUnixTimestamp(now())) IF NOT EXISTS");
        
        let prepared: PreparedStatement = self.session.prepare(query).await?;        
        self.session.execute(&prepared, (&container.kind,
            &container.zone,
            &container.workspace,
            &container.name,
            container.id,
            container.workload_id,
            container.node_id,
            &container.desired,
            if container.computed.is_some() { container.computed.as_ref() } else { Option::None },
            container.resource.as_ref().unwrap(),
            container.resource_hash.as_ref().unwrap(),
            container.owner.as_ref().unwrap()
        )).await?;
        Ok(())
    }   
    
    pub async fn 
    update_container_desired(&self, desired: &str, zone: &str, workspace: &str, name: &str)  
    -> Result<(), Box<dyn Error>> 
    {
        let query = format!("UPDATE containers SET desired=? WHERE kind='container' AND zone=? AND workspace=? AND name=?");        
        let prepared: PreparedStatement = self.session.prepare(query).await?;        
        self.session.execute(&prepared, (
            desired,
            zone,
            workspace,
            name
        )).await?;
        Ok(())
    }       
        
    // Private
    fn kind_to_table(kind: &ResourceKind) -> String {
        match kind {
            ResourceKind::Action => "actions".to_string(),
            ResourceKind::Node => "zoned_resources".to_string(),
            ResourceKind::Workload => "zoned_workspaced_resources".to_string(),
            ResourceKind::Container => "containers".to_string()
        }
    }

    fn kind_to_string(kind: &ResourceKind) -> String {
        match kind {
            ResourceKind::Action => "action".to_string(),         
            ResourceKind::Node => "node".to_string(),
            ResourceKind::Workload => "workload".to_string(),
            ResourceKind::Container => "container".to_string()
        }
    } 

    fn columns_for_table(table_kind: &str) -> String {
        match table_kind as &str {
            "actions" => "zone, id, resource_kind, resource_pk, action_type, origin, destination, insdate".to_string(),
            "resources" => "kind, name, id, meta, desired, observed, computed, resource, resource_hash".to_string(),
            "zoned_resources" => "kind, zone, name, id, meta, desired, observed, computed, resource, resource_hash".to_string(),
            "workspaced_resources" => "kind, workspace, name, id, meta, desired, observed, computed, resource, resource_hash".to_string(),
            "zoned_workspaced_resources" => "kind, zone, workspace, name, id, meta, desired, observed, computed, resource, resource_hash, owner, insdate".to_string(),
            "containers" => "kind, zone, workspace, name, id, workload_id, node_id, meta, desired, observed, computed, resource, resource_hash, owner, insdate".to_string(),
            _ => "kind, name, id, meta, desired, observed, computed, resource, resource_hash".to_string()
        }
    }
}