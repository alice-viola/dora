extern crate serde_json;
extern crate md5;
use crate::crud;
use crate::resources;
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use uuid::Uuid;

fn _type_of<T>(_: &T) -> String {
    std::any::type_name::<T>().to_string()
}

fn _print_type_of<T>(_: &T) {
    println!("{}", std::any::type_name::<T>())
}

async fn write_reason_message<'a>(crud: &'a crud::Crud, workload: &'a resources::Workload<'a>, reason_message: &str) {
    if workload.base.observed.is_none() || (workload.base.observed.is_some() && workload.base.observed.as_ref().unwrap()["reason"] != reason_message.to_string()) {
        let workload_observed = serde_json::json!({
            "state": reason_message.to_string()
        });
        let result = crud.update_workload_observed(&serde_json::to_string(&workload_observed).unwrap(), &workload.base.p().zone, &workload.base.p().workspace, &workload.base.p().name).await;
        match result {
            Ok(_r) => {},
            Err(e) => { println!("Error in write reason message: {:#?}", e); }
        }             
    }
}

async fn 
create_container_on_node<'a>(
    crud: &'a crud::Crud, 
    workload: &'a resources::Workload<'a>, 
    node_instance: &'a resources::Node<'a>, 
    nodes_available_resources: &HashMap<String, Vec<usize>>,
    container_name: &str) 
{
    let workload_resource = workload.base.resource.as_ref().unwrap();   
    let workload_zone = &workload.base.p().zone;
    let workload_workspace = &workload.base.p().workspace;
    let workload_id = &workload.base.p().id;
    
    let workload_hash = workload.base.p().resource_hash.as_ref().unwrap(); 

    let container_computed = serde_json::json!({
        "cpus": nodes_available_resources[&node_instance.base.p().id.to_string()],
        "volumes": [],
        "gpus": (),
        "mem": "1",
        "shmSize": 100000,
        "nodememory": "80000000"
    });

    println!("Container computed: {:#?} {:#?}", container_computed, nodes_available_resources);

    let container_struct = crud::ContainerSchema {
        kind: "container".to_string(), 
        zone: workload_zone.to_string(),
        workspace: workload_workspace.to_string(),
        name: container_name.to_string(),
        id: Uuid::new_v4(),
        workload_id: *workload_id,
        node_id: Some(node_instance.base.p().id),
        meta: Option::None,
        desired: "run".to_string(),
        observed: Option::None,
        computed: Some(serde_json::to_string(&container_computed).unwrap()),
        resource: Some(workload_resource.to_string()),
        resource_hash: Some(workload_hash.to_string()),
        owner: Some(workload.base.p().owner.as_ref().unwrap().to_string()),
        insdate: None
    };

    
    let result = crud.insert_container(&container_struct).await;
    match result {
        Ok(_r) => {},
        Err(e) => { println!("Error in inserting container: {:#?} {:#?}", container_struct, e); }
    }       
}

fn is_node_enabled(resource: &serde_json::value::Value) -> bool {
    let scheduling_disabled = &resource["schedulingDisabled"];
    if scheduling_disabled.as_bool() == None {
        return true
    } else {
        let sdb = scheduling_disabled.as_bool();
        if sdb.is_some() {
            return if sdb.unwrap() == false { true } else { false }
        } else {
            return true
        }
    }
}

fn is_node_ready(observed_wrapped: &Option<serde_json::value::Value>) -> bool {
    let mut is_ready = false;
    if observed_wrapped.is_some() {
        let observed = &observed_wrapped.as_ref().unwrap();
        if observed["lastSeen"].as_str() != None {
            let last_seen_date = DateTime::parse_from_rfc3339(observed["lastSeen"].as_str().unwrap());
            if last_seen_date.is_err() {
                is_ready = false;
            } else {
                let diff_secs = (Utc::now() - DateTime::<Utc>::from(last_seen_date.unwrap())).num_seconds();
                println!("Observed: {:#?} ", diff_secs);   
                if diff_secs <= 20 {
                    is_ready = true;
                } else {
                    is_ready = false;
                }
            }
        } else {
            is_ready = false;
        }
        is_ready
    } else {
        is_ready
    } 
}

async fn has_node_enough_resources<'a>(
    crud: &'a crud::Crud, 
    workload_kind: &str,
    workload_resource: &serde_json::value::Value, 
    node_instance: &'a resources::Node<'a>,
    nodes_available_resources: &mut HashMap<String, Vec<usize>>
) -> bool {
    let node_observed_wrapped = &node_instance.base.observed;
    if node_observed_wrapped.is_some() {
        // 1. First check the node resource kind
        let node_observed = node_observed_wrapped.as_ref().unwrap();
        if workload_kind == "CPUWorkload".to_string() {
            
            let cpu_count = &workload_resource["selectors"]["cpu"]["count"];
            let cpu_kind = &workload_resource["selectors"]["cpu"]["product_name"];
            let node_cpus = &node_observed["cpus"];
            let node_cpus_length = node_cpus.as_array().unwrap().len();

            // Return if the node hasn't the min quantity of cpu requested
            if cpu_count.as_i64().is_some() && (node_cpus_length as i64) < cpu_count.as_i64().unwrap() {
                return false
            }  
            
            let node_cpu_kind = if node_cpus_length > 0 {
                node_cpus[0]["product_name"].as_str().unwrap()
            } else {
                "None"
            };

            // Check kind type [string, array]            
            let mut ary_kind: Vec<String> = Vec::new();
            if cpu_kind.as_array() != None {
                println!("Required hardware {} array {}", cpu_kind, cpu_count);
                ary_kind = cpu_kind.as_array().unwrap().to_vec().iter().map(|x| x.as_str().unwrap().to_string()).collect::<Vec<_>>();
            } else if cpu_kind.as_str() != None {
                println!("Required hardware {} string {}", cpu_kind, cpu_count);
                if cpu_kind.as_str().unwrap() == "All" {
                    ary_kind = vec![node_cpu_kind.to_string()];
                } else {
                    ary_kind = vec![cpu_kind.as_str().unwrap().to_string()];
                }
            }
            let mut used_cpus_map = vec![];
        
            if ary_kind.iter().any(|i| i== &node_cpu_kind.to_string()) {
                let containers_on_node = &node_instance.get_containers().await;
                if containers_on_node.is_ok() {
                    let containers_on_node = containers_on_node.as_ref().unwrap();
                    if containers_on_node.len() == 0 {
                        let mut vec_of_free_cpus = vec![];
                        for i in 0..(cpu_count.as_u64().unwrap() as usize) {
                            vec_of_free_cpus.push(i);
                        }
                        nodes_available_resources.insert(node_instance.base.p().id.to_string(), vec_of_free_cpus);  
                        return true
                    } else {
                        let mut total_number_of_cpus_used = 0;
                        // TODO: add support for millicores!!
                        
                        for container_on_node in containers_on_node.iter() {
                            let c = resources::Container::load(&crud, container_on_node);
                            let c_cpus = &c.base.computed.as_ref().unwrap()["cpus"];
                            let c_cpus_ary = c_cpus.as_array().unwrap().to_vec();
                            for cpu in c_cpus_ary.iter() {
                                used_cpus_map.push(cpu.clone().to_string());
                            }
                            total_number_of_cpus_used = total_number_of_cpus_used  + c_cpus_ary.len();
                        }
                        // println!("USED {:#?}", used_cpus_map);
                        if (total_number_of_cpus_used as i64) + cpu_count.as_i64().unwrap() <= (node_cpus_length as i64) {
                            let mut available_cpus = vec![];
                            for i in 0..node_cpus_length {
                                if !used_cpus_map.contains(&i.to_string() ) {                                    
                                    available_cpus.push(i);
                                }
                                if available_cpus.len() == (cpu_count.as_u64().unwrap() as usize) {
                                    break
                                }
                            }
                            nodes_available_resources.insert(node_instance.base.p().id.to_string(), available_cpus);                            
                            return true
                        } else {
                            //return true
                            return false
                        }
                    }
                }
            }
        } else { // GPU CASE
            
        }
    }
    return false
}

pub async fn 
to_node<'a>(crud: &'a crud::Crud, workload: &'a resources::Workload<'a>, container_name: &str) {
    let mut suitable_nodes = Vec::new();
    let r = workload.base.resource.as_ref().unwrap();
    let workload_affinity_strategy = &r["config"]["affinity"];
    let cpu_selector = &r["selectors"]["cpu"];
    let gpu_selector = &r["selectors"]["gpu"];
    let workload_type: String = if cpu_selector["count"].as_i64() != None {
        println!("Requires CPU nodes");
        "CPUWorkload".to_string()
    } else if gpu_selector["count"].as_i64() != None {
        println!("Requires GPU nodes");
        "GPUWorkload".to_string()
    } else {
        println!("Unknown node requirements, default to CPU");
         "CPUWorkload".to_string()
    };

    // We will save here the node available resource
    let mut nodes_available_resources: HashMap<String, Vec<usize>> = HashMap::new();

    // 0. Get a subset (TODO) of zone nodes
    let nodes: Box<Vec<crud::ZonedResourceSchema>> = crud.get_nodes_subset().await.unwrap();

    for node in nodes.iter() {
        
        let node_instance = resources::Node::load(&crud, &node); 
        if node_instance.base.resource.is_some() {
            let node_resource = &node_instance.base.resource;
            let allows = &node_resource.as_ref().unwrap()["allow"];

            // 1. Check nodes is enabled
            if is_node_enabled(&node_resource.as_ref().unwrap()) == false {
                println!("Skipping node because has scheduling disabled");
                continue
            }

            // 2. Check nodes can schedule the requested type of workload
            //    and check is alive
            let mut node_go_on = false;
            if allows.as_array().is_some() {
                let ary_allow = allows.as_array().unwrap();
                if ary_allow.iter().any(|i| i.as_str()==Some(&workload_type)) {
                    if is_node_ready(&node_instance.base.observed) {
                        node_go_on = true;
                        println!("Node: is of the right type and is READY, checking resources");
                    }
                } 
            }   

            // 3. Check node free resources
            if node_go_on == true {
                let is_good = has_node_enough_resources(
                    &crud,
                    &workload_type,
                    &r, 
                    &node_instance,
                    &mut nodes_available_resources
                ).await;
                if is_good {
                    suitable_nodes.push(node_instance.clone());
                }
                println!("Node is good {}", is_good);
            }         
        }
    }
    if suitable_nodes.len() == 0 {
        write_reason_message(crud, &workload, "Some containers cannot be scheduled due nodes overload, they are put in queue").await;
        return
    }
    println!("Node availble resources: {:#?}", nodes_available_resources);

    let mut selected_node: Option<&resources::Node> = Option::None;
    if workload_affinity_strategy.to_string() == "First".to_string() {
        selected_node = Some(&suitable_nodes[0]);
        
    } else if workload_affinity_strategy.to_string() == "Random".to_string() {
        
    } else if workload_affinity_strategy.to_string() == "Distribute".to_string() {
        
    } else if workload_affinity_strategy.to_string() == "Fill".to_string() {
        
    } else {
        selected_node = Some(&suitable_nodes[0]);         
    }
    println!("Final Node {:#?}", selected_node.unwrap().base.p().name);
    create_container_on_node(&crud, &workload, &selected_node.unwrap(), &nodes_available_resources, &container_name).await;
} 

