extern crate serde_json;
extern crate md5;
use crate::crud;
use crate::resources;
use std::collections::HashMap;
use serde_json::Value;
use chrono::{Datelike, DateTime, Timelike, Utc};
use uuid::Uuid;
use scylla::frame::value::Timestamp;
use std::time::{SystemTime, UNIX_EPOCH, Duration};

fn type_of<T>(_: &T) -> String {
    std::any::type_name::<T>().to_string()
}

async fn 
create_container_on_node<'a>(
    crud: &'a crud::Crud, 
    workload: &'a resources::Workload<'a>, 
    node_instance: &'a resources::Node<'a>, 
    container_name: &str) 
{
    let workload_resource = workload.base.resource.as_ref().unwrap();   
    let workload_zone = &workload.base.p().zone;
    let workload_workspace = &workload.base.p().workspace;
    let workload_id = &workload.base.p().id;
    
    let desired = "run".to_string();
    let workload_hash = workload.base.p().resource_hash.as_ref().unwrap(); 

    let container_computed = serde_json::json!({
        "cpus": ["0"],
        "volumes": [],
        "gpus": (),
        "mem": "1",
        "shmSize": 100000,
        "nodememory": "80000000"
    });

    let container_struct = crud::ContainerSchema {
        kind: "container".to_string(), 
        zone: workload_zone.to_string(),
        workspace: workload_workspace.to_string(),
        name: container_name.to_string(),
        id: Uuid::new_v4(),
        workload_id: *workload_id,
        node_id: node_instance.base.p().id,
        meta: Option::None,
        desired: "run".to_string(),
        observed: Option::None,
        computed: Some(serde_json::to_string(&container_computed).unwrap()),
        resource: Some(workload_resource.to_string()),
        resource_hash: Some(workload_hash.to_string()),
        owner: Some(workload.base.p().owner.as_ref().unwrap().to_string()),
        insdate: None
    };

    println!("Container: {:#?}", container_struct);
    let result =  crud.insert_container(&container_struct).await;
    println!("Result: {:#?}", result);
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
    workload_kind: &str,
    workload_resource: &serde_json::value::Value, 
    node_instance: &'a resources::Node<'a>
    //node_observed_wrapped: &Option<serde_json::value::Value>
) -> bool {
    let node_observed_wrapped = &node_instance.base.observed;
    if node_observed_wrapped.is_some() {
        // 1. First check the node resource kind
        let node_observed = node_observed_wrapped.as_ref().unwrap();
        if workload_kind == "CPUWorkload".to_string() {
            //let matched_kind_nodes = Vec::new();
            let cpu_count = &workload_resource["selectors"]["cpu"]["count"];
            let cpu_kind = &workload_resource["selectors"]["cpu"]["product_name"];
            let node_cpus = &node_observed["cpus"];
            let node_cpus_length = node_cpus.as_array().unwrap().len();

            // Return the node hasn't the min quantity of cpu requested
            if cpu_count.as_i64().is_some() && (node_cpus_length as i64) < cpu_count.as_i64().unwrap() {
                return false
            }            

            let node_cpu_kind = if node_cpus_length > 0 {
                node_cpus[0]["product_name"].as_str().unwrap()
            } else {
                "None"
            };
            println!("-> {:#?} {:#?}", node_cpu_kind, node_cpus_length);

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
            println!("Ary kind {:#?}", ary_kind);
            if ary_kind.iter().any(|i| i== &node_cpu_kind.to_string()) {
                let containers_on_node = &node_instance.get_containers().await;
                if containers_on_node.is_ok() {
                    let containers_on_node = containers_on_node.as_ref().unwrap();
                    if containers_on_node.len() == 0 {
                        return true
                    } else {
                        // TODO when I will some data
                        return false
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
    let mut workload_type: String = if cpu_selector["count"].as_i64() != None {
        println!("Requires CPU nodes");
        "CPUWorkload".to_string()
    } else if gpu_selector["count"].as_i64() != None {
        println!("Requires GPU nodes");
        "GPUWorkload".to_string()
    } else {
        println!("Unknown node requirements");
         "CPUWorkload".to_string()
    };

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
                    &workload_type,
                    &r, 
                    &node_instance).await;
                if is_good {
                    suitable_nodes.push(node_instance.clone());
                }
                println!("Node is good {}", is_good);
            }         
        }
    }
    if suitable_nodes.len() == 0 {
        println!("No suitable node");
        return
    }

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
    create_container_on_node(&crud, &workload, &selected_node.unwrap(), &container_name).await;
    /*for node in suitable_nodes.iter() {
        println!("Suitable node: {:#?}", node.base.resource);
    }*/
} 

