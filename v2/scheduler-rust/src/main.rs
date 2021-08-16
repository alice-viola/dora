extern crate schedule_recv;
extern crate scylla;
extern crate tokio;
use scylla::{SessionBuilder};
use std::error::Error;
use schedule_recv::periodic_ms;

mod resources;
mod scheduler;
mod crud;

/*
async fn original () ->  Result<(), Box<dyn Error>> {
    let ms: u32 = 1000;
    let ms_period = periodic_ms(ms);
    
    let replica_controller = scheduler::ReplicaController::new();
    
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
    
    let rows = crud_facility.read(&crud::ResourceKind::Zone).await?;
    let rows_iter = rows.iter();
    for row in rows_iter {
        //println!("Got: {:?}", row.columns[0].as_ref().unwrap().as_text().unwrap());
        println!("Got: {:?}", row);
    }

    // Scheduler loop
    // loop {
    //     ms_period.recv().unwrap();
    //     // replica_controller.run();
    //     let rows = crud::read(&scylla_driver, &keyspace, "resources", "").await?;
    //     
    //     break;
    // }

    Ok(())
}*/

async fn resources_version () -> Result<(), Box<dyn Error>> {
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

    let node = resources::User::new(&crud_facility);

    let rows = node.common().get().await?;
    let rows_iter = rows.iter();
    for row in rows_iter {
        //println!("Got: {:?}", row.columns[0].as_ref().unwrap().as_text().unwrap());
        println!("Got: {:?}", row);
    }  

    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // original().await
    resources_version().await
}