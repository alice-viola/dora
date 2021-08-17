extern crate scylla;
extern crate tokio;
use std::collections::HashMap;
use futures::stream::StreamExt;
use std::error::Error;
use scylla::{IntoTypedRows};
use scylla::transport::session::Session;
use scylla::prepared_statement::PreparedStatement;
use scylla::frame::value::Timestamp;
use scylla::macros::FromRow;
use scylla::frame::response::cql_to_rust::FromRow;
use uuid::Uuid;
use chrono::Duration;
use std::fmt;

fn print_type_of<T>(_: &T) {
    println!("{}", std::any::type_name::<T>())
}

pub enum ResourceKind {
    Zone,
    Zones,
    Node,
    Nodes,
    Workload,
    Workloads,
    Container,
    Containers,
    User,
    Users
}

#[derive(FromRow, Debug)]
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


#[derive(FromRow, Debug)]
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

pub enum ResourceKindSchema {
    RS(ResourceSchema),
    ZRS(ZonedResourceSchema),
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
        Crud{session: session_to_use, keyspace: "default".to_string()} // std::option::Option::None
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
    read<T: FromRow + fmt::Debug>(&self, kind: &ResourceKind)  
    -> Result<Box<Vec<T>>, Box<dyn Error>> 
    {    
        let mut rows_vec = Box::new(Vec::new());
        let table_name = Crud::kind_to_table(kind);
        let columns_for = Crud::columns_for_table(&table_name); 
        let query = format!("{}{}{}{}{}{}{}", 
            "SELECT ", columns_for, " FROM ", table_name,
            " WHERE kind='", Crud::kind_to_string(kind), "'");

        println!("Q: {}", query);
                
        let mut prepared: PreparedStatement = self.session.prepare(query).await?;   
        prepared.set_page_size(1000);     
        let mut rows_stream = self.session.execute_iter(prepared, &[]).await?.into_typed::<T>();
    
        while let Some(next_row_res) = rows_stream.next().await {
            let row = next_row_res?; 
            rows_vec.push(row);
            //let data: ResourceSchema = row.clone();
            //println!("ROW: {:#?}", row);
        }    
        Ok(rows_vec)
    }  

    // Private
    fn kind_to_table(kind: &ResourceKind) -> String {
        match kind {
            ResourceKind::Zone => "resources".to_string(),
            ResourceKind::Zones => "resources".to_string(),
            ResourceKind::Node => "zoned_resources".to_string(),
            ResourceKind::Nodes => "zoned_resources".to_string(),
            ResourceKind::Workload => "zoned_workspaced_resources".to_string(),
            ResourceKind::Workloads => "zoned_workspaced_resources".to_string(),
            ResourceKind::Container => "containers".to_string(),
            ResourceKind::Containers => "containers".to_string(),
            ResourceKind::User => "resources".to_string(),
            ResourceKind::Users => "resources".to_string(),
        }
    }

    fn kind_to_string(kind: &ResourceKind) -> String {
        match kind {
            ResourceKind::Zone => "zone".to_string(),
            ResourceKind::Zones => "zone".to_string(),
            ResourceKind::Node => "node".to_string(),
            ResourceKind::Nodes => "node".to_string(),
            ResourceKind::Workload => "workload".to_string(),
            ResourceKind::Workloads => "workload".to_string(),
            ResourceKind::Container => "container".to_string(),
            ResourceKind::Containers => "container".to_string(),
            ResourceKind::User => "user".to_string(),
            ResourceKind::Users => "user".to_string(),
        }
    } 

    fn columns_for_table(table_kind: &str) -> String {
        match table_kind as &str {
            "resources" => "kind, name, id, meta, desired, observed, computed, resource, resource_hash".to_string(),
            "zoned_resources" => "kind, zone, name, id, meta, desired, observed, computed, resource, resource_hash".to_string(),
            _ => "kind, name, id, meta, desired, observed, computed, resource, resource_hash".to_string()
        }
    }
}