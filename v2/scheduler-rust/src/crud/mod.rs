extern crate scylla;
extern crate tokio;
use futures::stream::StreamExt;
use std::error::Error;
use scylla::{IntoTypedRows, Session};
use scylla::prepared_statement::PreparedStatement;

//enum KindToTable {
//    Zone: String = "zoned_resources".to_string(),
//}

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

pub struct Crud {
    session: Box<Session>,
    keyspace: String
}

#[allow(dead_code)]
impl Crud  {

    // Public methods
    pub fn new(session_to_use: Box<Session>) -> Crud  {
        Crud{session: session_to_use, keyspace: "default".to_string()} // std::option::Option::None
    }

    pub async fn init_keyspace_if_not_exist(&self, keyspace: &str) -> Result<(), Box<dyn Error>> {
        let init_str = format!(
            "{}{}{}", "CREATE KEYSPACE IF NOT EXISTS " , 
            keyspace, 
            " WITH REPLICATION = {'class' : 'SimpleStrategy', 'replication_factor' : 1}" );
    
        self.session.query(init_str,  &[], ).await?;
        Ok(())
    }
    pub fn set_session(&mut self, session_box: Box<Session>) {
        self.session = session_box;
    }

    pub async fn use_keyspace(&mut self, keyspace: &str) -> Result<(), Box<dyn Error>> {
        self.keyspace = keyspace.to_string().clone();
        self.session.use_keyspace(&self.keyspace, false).await?;
        Ok(())
    }

    pub async fn read(&self, kind: &ResourceKind) -> Result<Box<Vec<scylla::frame::response::result::Row>>, Box<dyn Error>> {    
        let mut rows_vec = Box::new(Vec::new());
        let table_name = Crud::kind_to_table(kind);
        let query = format!("{}{}", "SELECT * FROM ", table_name);
        let query = format!("{}{}", query, " WHERE kind='");
        let query = format!("{}{}", query, Crud::kind_to_string(kind));
        let query = format!("{}{}", query, "'");
        println!("QUERY: {}", query);
        let prepared: PreparedStatement = self.session.prepare(query).await?;
    
        let mut rows_stream = self.session.execute_iter(prepared, &[]).await?;
            //.into_typed::<(String)>();
    
        while let Some(next_row_res) = rows_stream.next().await {
            let row = next_row_res?;            
            rows_vec.push(row);            
        }
        Ok(rows_vec)
    }  

    // Private methods
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
}