extern crate serde_json;
use crate::crud;
use crate::resources;
use futures::join;
use tokio::time::{self, Duration};
use std::collections::HashMap;
use uuid::Uuid;
pub mod assign;

fn _print_type_of<T>(_: &T) {
    println!("{}", std::any::type_name::<T>())
}

// Scheduler Replica Controller
pub struct ReplicaController<'a>  {
    crud: &'a crud::Crud,
    fetch_all: i64,
    zone: String,
    ms: u64,

    workload_action_map: HashMap<String, Uuid>
}

impl<'a> ReplicaController<'a> {
    pub fn new(crud: &'a  crud::Crud, zone: &'a str, ms: u64) -> ReplicaController<'a> {
        ReplicaController{
            crud: crud, 
            fetch_all: 0, 
            zone: (*zone).to_string(), 
            ms: ms,
            workload_action_map: HashMap::new()
        }
    }

    pub async fn start(&mut self) {
        println!("Running replica controller for zone: {}", self.zone);
        let mut interval = time::interval(Duration::from_millis(self.ms));
        loop {
            self.next_tick().await;
            interval.tick().await;
        }        
    }

    pub async fn next_tick(&mut self) {         
        // println!("@@@ next_tick"); 
        self.workload_action_map = HashMap::new();
        let actions_wk_f = self.fetch_workloads_actions();
        let actions_c_f = self.fetch_containers_actions(); 
        
        let workloads: Box<Vec<crud::ZonedWorkspacedResourceSchema>> = if self.fetch_all == 0 {
            self.fetch_workloads().await
        } else {
            Box::new(Vec::new())
        };
        let (actions_wk, actions_c) = join!(actions_wk_f, actions_c_f);
        self.process(workloads, actions_wk, actions_c).await;
    }

    // Private
    async fn 
    process(&mut self, 
        workloads:  Box<Vec<crud::ZonedWorkspacedResourceSchema>>,
        actions_wk: Box<Vec<crud::ActionSchema>>,
        actions_c:  Box<Vec<crud::ActionSchema>>
    ) {
        self.process_containers_actions(actions_c).await;
        
        if self.fetch_all == 0 {
            self.process_workloads(workloads).await;
            self.fetch_all = self.fetch_all + 1;
        } else {
            let wk_to_process = self.process_workloads_actions(actions_wk).await;
            self.process_workloads(wk_to_process).await;
            self.fetch_all = self.fetch_all + 1;
        }
        // Todo, make this configurable
        if self.fetch_all >= (10 * 1000) / self.ms as i64 {
            self.fetch_all = 0;
        }
    }

    async fn
    process_workloads_actions(&mut self, mut actions_wk:  Box<Vec<crud::ActionSchema>>) 
    -> Box<Vec<crud::ZonedWorkspacedResourceSchema>> {
        let mut wk_to_process = Box::new(Vec::new());
        actions_wk.sort_by(|a, b| b.insdate.cmp(&a.insdate));
        // Keep only the last action for every workload
        let mut workloads_action_map = HashMap::new();
        for action in actions_wk.iter() {  
            let pk: serde_json::Value = serde_json::from_str(&action.resource_pk).unwrap();
            let key = format!("{}.{}.{}", 
                pk["zone"].as_str().unwrap(), 
                pk["workspace"].as_str().unwrap(), 
                pk["name"].as_str().unwrap());
            if !workloads_action_map.contains_key(&key) {
                match action.action_type.as_str() {
                    "insert" => {
                        wk_to_process.append(&mut self.fetch_workload(pk["zone"].as_str().unwrap(), pk["workspace"].as_str().unwrap(), pk["name"].as_str().unwrap()).await.to_vec());  
                        self.workload_action_map.insert(key.clone(), action.id);                      
                        println!("Require insert action");   
                    },
                    "update" => {
                        wk_to_process.append(&mut self.fetch_workload(pk["zone"].as_str().unwrap(), pk["workspace"].as_str().unwrap(), pk["name"].as_str().unwrap()).await.to_vec());
                        self.workload_action_map.insert(key.clone(), action.id);
                        println!("Require update action");                                                 
                    },  
                    "delete" => {
                        wk_to_process.append(&mut self.fetch_workload(pk["zone"].as_str().unwrap(), pk["workspace"].as_str().unwrap(), pk["name"].as_str().unwrap()).await.to_vec());
                        self.workload_action_map.insert(key.clone(), action.id);
                        println!("Require delete action");                                                 
                    },                                        
                    _ => println!("Requires not managed {}", action.action_type),    
                }
                workloads_action_map.insert(key.clone(), action.action_type.clone());
            } else {
                let result = self.crud.delete_action(pk["zone"].as_str().unwrap(), "workload", "replica-controller", action.id).await;
                match result {
                    Ok(_r) => {},
                    Err(e) => { println!("Error in delete action: {:#?}", e); }
                }
            }
        }
        wk_to_process
    }    

    async fn
    process_containers_actions(&self, mut actions_c:  Box<Vec<crud::ActionSchema>>) {
        actions_c.sort_by(|a, b| b.insdate.cmp(&a.insdate));
        // Keep only the last action for every container
        let mut containers_action_map = HashMap::new();
        for action in actions_c.iter() {  
            println!("A {:#?} {:#?} {:#?}", action.action_type, action.resource_pk, action.insdate);
            let pk: serde_json::Value = serde_json::from_str(&action.resource_pk).unwrap();
            let key = format!("{}.{}.{}", 
                pk["zone"].as_str().unwrap(), 
                pk["workspace"].as_str().unwrap(), 
                pk["name"].as_str().unwrap());
            if !containers_action_map.contains_key(&key) {
                match action.action_type.as_str() {
                    "delete" => {
                        // TODO decrease replica count
                        let delete_result = self.crud.delete_container(pk["zone"].as_str().unwrap(), pk["workspace"].as_str().unwrap(), pk["name"].as_str().unwrap()).await;
                        match delete_result {
                            Ok(_v) => {
                                let result = self.crud.delete_action(pk["zone"].as_str().unwrap(), "container", "replica-controller", action.id).await;
                                match result {
                                    Ok(_r) => {},
                                    Err(e) => { println!("Error in delete action: {:#?}", e); }
                                }                                
                            }
                            Err(e) => {
                                println!("Error in deleting container {:#?}", e);
                            }
                        }                        
                    },
                    _ => println!("Requires not managed {}", action.action_type),    
                }
                containers_action_map.insert(key.clone(), action.action_type.clone());
            } else {
                let result = self.crud.delete_action(pk["zone"].as_str().unwrap(), "container", "replica-controller", action.id).await;
                match result {
                    Ok(_r) => {},
                    Err(e) => { println!("Error in delete action: {:#?}", e); }
                }                
            }
        }
    }

    async fn
    process_workloads(&mut self, mut workloads: Box<Vec<crud::ZonedWorkspacedResourceSchema>>) {
        // Todo, sort priority, credits
        workloads.sort_by(|a, b| a.insdate.cmp(&b.insdate));
        let iter = workloads.iter();
        for workload in iter {          
            let key = format!("{}.{}.{}", workload.zone, workload.workspace, workload.name);
            let key_value = self.workload_action_map.remove(&key);
            let workload_instance = resources::Workload::load(&self.crud, workload, key_value);    
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
            println!("---> It's idle");
            if workload.action_id != None {
                let result = self.crud.delete_action(&workload.base.p().zone, "workload", "replica-controller", workload.action_id.unwrap()).await;
                match result {
                    Ok(_r) => {},
                    Err(e) => { println!("Error in delete action: {:#?}", e); }
                }                
            }            
            return
        }

        if desired == "run" && containers_count < replica_count {
            self.scale_up(&workload, &containers).await;
            return
        }

        if desired == "run" && containers_count == replica_count {
            println!("---> It's to check if updated");
            let is_updated = self.is_updated(&workload, &containers).await;
            if is_updated == true {
                // We can delete the action if present
                if workload.action_id != None {
                    let result = self.crud.delete_action(&workload.base.p().zone, "workload", "replica-controller", workload.action_id.unwrap()).await;
                    match result {
                        Ok(_r) => {},
                        Err(e) => { println!("Error in delete action: {:#?}", e); }
                    }                    
                }
            }
            return
        }    
        
        if desired == "run" && containers_count > replica_count {            
            self.scale_down(&containers).await;
            return
        }            

        if desired == "drain" && containers_count > 0 {
            self.scale_down(&containers).await;
            return
        }   

        if desired == "drain" && containers_count == 0 {
            if workload.action_id != None {
                let result = self.crud.delete_action(&workload.base.p().zone, "workload", "replica-controller", workload.action_id.unwrap()).await;
                match result {
                    Ok(_r) => {},
                    Err(e) => { println!("Error in delete action: {:#?}", e); }
                }                
            }            
            let result = self.crud.delete_workload(&workload.base.p().zone, &workload.base.p().workspace, &workload.base.p().name).await;
            match result {
                Ok(_r) => {},
                Err(e) => { println!("Error in delete workload: {:#?}", e); }
            }            
            return
        }           
    }

    // Check is updated 
    async fn is_updated(&self, workload: &resources::Workload<'a>, containers: &Vec<resources::Container<'a>>) -> bool {
        let workload_hash = workload.base.p().resource_hash.as_ref().unwrap(); 
        let mut is_updated = true;
        for container in containers.iter() {          
            let container_hash = container.base.p().resource_hash.as_ref().unwrap();             
            if workload_hash != container_hash {
                println!("Matchin resource hash {}", workload_hash == container_hash);
                is_updated = false;
                let result = self.crud.update_container_desired("drain", &container.base.p().zone, &container.base.p().workspace, &container.base.p().name).await;
                match result {
                    Ok(_r) => {},
                    Err(e) => { println!("Error in update container desired state: {:#?}", e); }
                }                
            }
        }
        is_updated
    }

    // Scale up
    async fn scale_up(&self, workload: &resources::Workload<'a>, containers: &Vec<resources::Container<'a>>) {
        println!("---> It's to increase replica count");
        let r = workload.base.resource.as_ref().unwrap();      
        let p = &workload.base.p.as_ref().unwrap();
        let name = &p.name; 
        let replica_count = *&r["replica"]["count"].as_i64().unwrap() as usize;

        let containers_names: Vec<_> = containers.into_iter().map(|c| return &c.base.p.as_ref().unwrap().name).rev().collect();
        println!("->>> {:#?}", containers_names);
        for replica_index in 0..replica_count {
            let container_name = format!("{}.{}", name, replica_index);
            if containers_names.iter().any(|&i| i==&container_name) {
                println!("-> {} found", container_name); 
            } else {
                println!("-> {} not found, creating", container_name); 
                assign::to_node(&self.crud, &workload, &container_name).await;
            }        
        }
    }

    // Scale down
    async fn scale_down(&self, containers: &Vec<resources::Container<'a>>) {
        println!("---> It's to decrease replica count");   
        if containers.len() > 0 {     
            if containers[containers.len() - 1].base.p().desired != "drain" {
                println!(" - - - - {:#?}", containers[containers.len() - 1].base.p().desired);
                let result = self.crud.update_container_desired("drain", &containers[containers.len() - 1].base.p().zone, &containers[containers.len() - 1].base.p().workspace, &containers[containers.len() - 1].base.p().name).await;
                match result {
                    Ok(_r) => {},
                    Err(e) => { println!("Error in update container desired: {:#?}", e); }
                }                
            }
        }
    }

    async fn fetch_workloads(&self) -> Box<Vec<crud::ZonedWorkspacedResourceSchema>> {
        resources::Workload::new(&self.crud).common().get_by_zone(&self.zone, Option::None).await.unwrap() 
            as Box<Vec<crud::ZonedWorkspacedResourceSchema>>
    }

    async fn fetch_workload(&self, zone: &str, workspace: &str, name: &str) -> Box<Vec<crud::ZonedWorkspacedResourceSchema>> {
        resources::Workload::new(&self.crud).common().get_by_zone_and_workspace_and_name(zone, workspace, name).await.unwrap() 
            as Box<Vec<crud::ZonedWorkspacedResourceSchema>>
    }    

    async fn fetch_workloads_actions(&self) -> Box<Vec<crud::ActionSchema>> {
        resources::Action::new(&self.crud).get(&self.zone, "workload", "replica-controller").await.unwrap() 
            as Box<Vec<crud::ActionSchema>>
    }

    async fn fetch_containers_actions(&self) -> Box<Vec<crud::ActionSchema>> {
        resources::Action::new(&self.crud).get(&self.zone, "container", "replica-controller").await.unwrap()
            as Box<Vec<crud::ActionSchema>>
    }
}