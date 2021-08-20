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
    let uri = std::env::var("SCYLLA_URI").unwrap_or_else(|_| "127.0.0.1:9042".to_string());
    let keyspace = std::env::var("SCYLLA_KS").unwrap_or_else(|_| "doraprod01".to_string());
    let scylla_driver = SessionBuilder::new()
        .known_node(uri)
        .build()
        .await?; 

    let scylla_driver_box = Box::new(scylla_driver);

    // Setup the keyspace
    let mut crud_facility = crud::Crud::new(scylla_driver_box);
    crud_facility.init_keyspace_if_not_exist(&keyspace).await?;
    crud_facility.use_keyspace(&keyspace).await?;   

    // Setup the scheduler
    let ms: u64 = 200;  
    let mut replica_controller = scheduler::ReplicaController::new(&crud_facility, "dc-test-01", ms);

    // Run
    replica_controller.start().await;
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    run_scheduler().await
}