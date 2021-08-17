extern crate serde_json;
use crate::crud;
use crate::resources;
use futures::join;
use std::error::Error;
use tokio::time::{self, Duration};
use serde_json::{Result, Value};
use serde_json::Value::Number;

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
            
            // Get containers for workload
            let workload_containers = resources::Container::new(&self.crud).get_by_workload_id(&workload.id).await.unwrap() 
                as Box<Vec<crud::ContainerSchema>>;        

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
        // Parse workload resource definition stored as JSON            
        //let v: Value = serde_json::from_str(&workload.base.p().resource.as_ref().unwrap()).unwrap();
        let v = workload.resource();
                    
        let name = &workload.base.p().name; 
        let desired = &workload.base.p().desired;
        //let replica_count: u64 = serde_json::from_value(v["replica"]["count"]).unwrap();
        let replica_count = &v["replica"]["count"];
        //print_type_of(&replica_count);
        let containers_count = containers.len();
        println!("Processing workload *{}* with desired *{}* and *{}/{}* containers", name, desired, containers_count, replica_count);

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