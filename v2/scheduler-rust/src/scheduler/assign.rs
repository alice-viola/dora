extern crate serde_json;
use crate::crud;
use crate::resources;
use chrono::{Datelike, DateTime, Timelike, Utc};

fn type_of<T>(_: &T) -> String {
    std::any::type_name::<T>().to_string()
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

fn has_node_enough_resources(
    workload_kind: &str,
    workload_resource: &serde_json::value::Value, 
    node_observed_wrapped: &Option<serde_json::value::Value>,
    node_computed_wrapped: &Option<serde_json::value::Value>
) -> bool {
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
                if node_computed_wrapped.is_some() { // Check free resources
                    println!("Check resources");
                } else { // First workload on this node
                    println!("Empty node");
                    return true
                }
            }
        } else {
            
        }
    }
    return false
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

    // 0. Get a subset (TODO) of zone nodes
    let nodes: Box<Vec<crud::ZonedResourceSchema>> = crud.get_nodes_subset().await.unwrap();

    for node in nodes.iter() {
        
        let node_instance = resources::Node::load(&crud, &node); 
        if node_instance.base.resource.is_some() {
            let node_resource = &node_instance.base.resource.unwrap();
            let allows = &node_resource["allow"];

            // 1. Check nodes is enabled
            if is_node_enabled(&node_resource) == false {
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
                    &node_instance.base.observed, 
                    &node_instance.base.computed);
                println!("Node is good {}", is_good);
            }         
        }
    }
} 

