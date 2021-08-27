// New Rust implementation for the Dora scheduler.
//
// Do not judge the style, I know is not the
// best Rust style. After this will work good
// we will refactor it.

extern crate schedule_recv;
extern crate scylla;
extern crate tokio;
use scylla::{SessionBuilder};
use std::error::Error;

mod resources;
mod scheduler;
mod crud;

async fn run_scheduler () -> Result<(), Box<dyn Error>> {
    // Get a Scylla session
    let zone = std::env::var("ZONE").unwrap_or_else(|_| "dc-test-01".to_string());
    let uri = std::env::var("CONTACT_POINTS").unwrap_or_else(|_| "127.0.0.1:9042".to_string());
    let keyspace = std::env::var("DB_NAME").unwrap_or_else(|_| "doraprod01".to_string());
    let scylla_driver = SessionBuilder::new()
        .known_node(uri)
        .build()
        .await?; 

    

    let scylla_driver_box = Box::new(scylla_driver);

    // Setup the keyspace
    let mut crud_facility = crud::Crud::new(scylla_driver_box);
    crud_facility.init_keyspace_if_not_exist(&keyspace).await?;
    let ks_res = crud_facility.use_keyspace(&keyspace).await?;   
    println!("Connected to Scylla in keyspace {} {:#?}", keyspace, ks_res);
    
    // Setup the scheduler
    let ms: u64 = 1000;  
    let mut replica_controller = scheduler::ReplicaController::new(&crud_facility, &zone, ms);

    // Run
    replica_controller.start().await;
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    run_scheduler().await
}