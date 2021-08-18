extern crate serde_json;
use crate::crud;
use crate::resources;
use chrono::{Datelike, DateTime, Timelike, Utc};

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

fn is_node_ready(observed: &serde_json::value::Value) -> bool {
    let mut is_ready = false;
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
}

pub async fn 
find_suitable_nodes<'a>(crud: &'a crud::Crud, workload: &'a resources::Workload<'a>) {
    let r = workload.base.resource.as_ref().unwrap();
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

    let nodes: Box<Vec<crud::ZonedResourceSchema>> = crud.get_nodes_subset().await.unwrap();

    //let available_nodes = Vec::new();
    for node in nodes.iter() {
        
        let node_instance = resources::Node::load(&crud, &node); 
        if node_instance.base.resource.is_some() {
            let node_resource = &node_instance.base.resource.unwrap();
            let allows = &node_resource["allow"];
            //let scheduling_disabled = &node_resource["schedulingDisabled"];
            
            if is_node_enabled(&node_resource) == false {
                println!("Skipping node because has scheduling disabled");
                continue
            }
            // let observed = &node_instance.base.observed.unwrap()
            if allows.as_array().is_some() {
                let ary_allow = allows.as_array().unwrap();
                if ary_allow.iter().any(|i| i.as_str()==Some(&workload_type)) {
                    if node_instance.base.observed.is_some() 
                        && is_node_ready(&node_instance.base.observed.unwrap()) {
                        println!("Node: is of the right type and is READY");
                    }
                } 
            }            
        }
    }
} 

