extern crate serde_json;
use crate::crud;
use crate::resources;
use futures::join;
use std::error::Error;
use tokio::time::{self, Duration};
use serde_json::{Result, Value};
use serde_json::Value::Number;
pub mod assign;

fn print_type_of<T>(_: &T) {
    println!("{}", std::any::type_name::<T>())
}

// Scheduler Replica Controller
pub struct ReplicaController<'a>  {
    crud: &'a crud::Crud,
    fetch_all: bool,
    is_running: Option<bool>,
    zone: String,
    ms: u64
}

impl<'a> ReplicaController<'a> {
    pub fn new(crud: &'a  crud::Crud, zone: &'a str, ms: u64) -> ReplicaController<'a> {
        ReplicaController{
            crud: crud, 
            fetch_all: true, 
            zone: (*zone).to_string(), 
            ms: ms, 
            is_running: Some(false)
        }
    }

    pub async fn start(&mut self) {
        println!("Running replica controller for zone: {}", self.zone);
        let mut interval = time::interval(Duration::from_millis(self.ms));
        loop {
            /*if self.is_running.is_some() && self.is_running.unwrap() == false {
                self.next_tick().await;
            }*/
            self.next_tick().await;
            interval.tick().await;
        }        
    }

    pub async fn next_tick(&mut self) {         
        println!("@@@ next_tick"); 
        self.signal_start_running();
        
        let actions_wk_f = self.fetch_workloads_actions();
        let actions_c_f = self.fetch_containers_actions();               
        let workloads: Box<Vec<crud::ZonedWorkspacedResourceSchema>> = if self.fetch_all == true {
            self.fetch_workloads().await
        } else {
            Box::new(Vec::new())
        };
        let (actions_wk, actions_c) = join!(actions_wk_f, actions_c_f);
        self.process(workloads, actions_wk, actions_c).await;

        self.signal_end_running();
    }

    // Private
    async fn 
    process(&self, 
        workloads:  Box<Vec<crud::ZonedWorkspacedResourceSchema>>,
        actions_wk: Box<Vec<crud::ActionSchema>>,
        actions_c:  Box<Vec<crud::ActionSchema>>
    ) {
        self.process_workloads(workloads).await;
    }

    async fn
    process_workloads(&self, workloads:  Box<Vec<crud::ZonedWorkspacedResourceSchema>>) {
        let iter = workloads.iter();
        for workload in iter {          
            let workload_instance = resources::Workload::load(&self.crud, workload); 
            //let workload_containers: std::result::Result<Box<Vec<crud::ContainerSchema>>, Box<dyn std::error::Error>>  = resources::Container::new(&self.crud).get_by_workload_id(&workload.id).await;
            /*let f = match workload_containers {
                Ok(wk) => (),
                Err(error) => println!("Error in getting containers by workload_id {:#?}", error)
            };   */    
            // Get containers for workload     
            let workload_containers = resources::Container::new(&self.crud).get_by_workload_id(&workload.id).await.unwrap() as Box<Vec<crud::ContainerSchema>>;
            let mut containers_instances = Vec::new();
            let iter_containers = workload_containers.iter();
            for container in iter_containers {
                containers_instances.push(resources::Container::load(&self.crud, container));
            }
            self.process_workload(&workload_instance, &containers_instances).await;
        }  
    }

    async fn 
    process_workload(&self, workload: &resources::Workload<'a>, containers: &Vec<resources::Container<'a>>) {
        let r = workload.base.resource.as_ref().unwrap();      
        let p = &workload.base.p.as_ref().unwrap();
        let name = &p.name; 
        let desired = &p.desired;
        let replica_count = *&r["replica"]["count"].as_i64().unwrap() as usize;

        let containers_count = containers.len();
        println!("Processing workload *{}* with desired *{}* and *{}/{}* containers", name, desired, containers_count, replica_count);

        // Take the correct action based on replica
        // status


        if desired == "run" && containers_count == replica_count && replica_count == 0 {
            println!("---> It's steady");
            return
        }

        if desired == "run" && containers_count < replica_count {
            self.increase_replica_count(&workload, &containers).await;
            return
        }

        if desired == "run" && containers_count == replica_count {
            println!("---> It's to check if updated");
            return
        }    
        
        if desired == "run" && containers_count > replica_count {
            println!("---> It's to decrease replica count");
            return
        }            

        if desired == "drain" && containers_count > 0 {
            println!("---> It's to drain containers");
            return
        }   
    }

    async fn increase_replica_count(&self, workload: &resources::Workload<'a>, containers: &Vec<resources::Container<'a>>) {
        println!("---> It's to increase replica count");
        let r = workload.base.resource.as_ref().unwrap();      
        let p = &workload.base.p.as_ref().unwrap();
        let name = &p.name; 
        let desired = &p.desired;
        let replica_count = *&r["replica"]["count"].as_i64().unwrap() as usize;

        let containers_names: Vec<_> = containers.into_iter().map(|c| return &c.base.p.as_ref().unwrap().name).rev().collect();
        println!("->>> {:#?}", containers_names);
        for replica_index in 0..replica_count {
            let container_name = format!("{}.{}", name, replica_index);
            if containers_names.iter().any(|&i| i==&container_name) {
                println!("-> {} found", container_name); 
            } else {
                println!("-> {} not found, creating", container_name); 
                self.assign_container(workload, &container_name).await;

            }        
            
        }
    }

    async fn assign_container(&self, workload: &resources::Workload<'a>, container_name: &str) {
        assign::to_node(&self.crud, &workload, &container_name).await;
    }

    fn signal_start_running(&mut self) {
        self.is_running.take();
        self.is_running = Some(true);
    }

    fn signal_end_running(&mut self) {
        self.is_running.take();
        self.is_running = Some(false);
    }

    async fn fetch_workloads(&self) -> Box<Vec<crud::ZonedWorkspacedResourceSchema>> {
        resources::Workload::new(&self.crud).common().get_by_zone(&self.zone, Option::None).await.unwrap() 
            as Box<Vec<crud::ZonedWorkspacedResourceSchema>>
    }

    async fn fetch_workloads_actions(&self) -> Box<Vec<crud::ActionSchema>> {
        resources::Action::new(&self.crud).get(&self.zone, "workload", "replica-controller").await.unwrap() 
            as Box<Vec<crud::ActionSchema>>
    }

    async fn fetch_containers_actions(&self) -> Box<Vec<crud::ActionSchema>> {
        resources::Action::new(&self.crud).get(&self.zone, "containers", "replica-controller").await.unwrap()
            as Box<Vec<crud::ActionSchema>>
    }

    
}