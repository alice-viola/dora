extern crate serde_json;
extern crate md5;
use crate::crud;
use crate::resources;
use rand::Rng; 
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use uuid::Uuid;

fn _type_of<T>(_: &T) -> String {
    std::any::type_name::<T>().to_string()
}

fn _print_type_of<T>(_: &T) {
    println!("{}", std::any::type_name::<T>())
}

fn get_milli_cores_from_cpu(value: &str) -> String {
    let mut chars = value.chars();
    chars.next_back();
    chars.as_str().to_string()
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
get_volumes_for_container<'a>(
    crud: &'a crud::Crud,
    workload: &'a resources::Workload<'a>     
) -> Vec<serde_json::Value> {
    let mut volumes_to_attach = vec![];
    let workload_resource = workload.base.resource.as_ref().unwrap();   
    
    let volumes_to_add = match &workload_resource["volumes"] {
        serde_json::Value::Array(v) => v.to_vec(),
        serde_json::Value::Null =>  vec![],
        _ => vec![]
    };

    for volume in volumes_to_add.iter() {
        let volume_name = volume["name"].as_str().unwrap();
        let volume_workspace = volume["workspace"].as_str().unwrap_or(&workload.base.p().workspace);
        let volume_zone = &workload.base.p().zone;
        let volume_target_str = format!("/{}", volume_name);
        let volume_target = volume["target"].as_str().unwrap_or(&volume_target_str);
        let vol_schema = resources::Volume::new(&crud).common().get_by_zone_and_workspace_and_name(&volume_zone, &volume_workspace, &volume_name).await.unwrap() as Box<Vec<crud::ZonedWorkspacedResourceSchema>>;     
        
        if vol_schema.len() == 1 {
            let vol_instance = resources::Volume::load(&crud, &vol_schema[0]);
            let vol_resource = vol_instance.base.resource;
            match vol_resource {
                Some(v) => {                    
                    let storage_name = v["storage"].as_str().unwrap();
                    let storage_schema = resources::Storage::new(&crud).common().get_by_zone_and_name(&volume_zone, &storage_name).await.unwrap() as Box<Vec<crud::ZonedResourceSchema>>;     
                    if storage_schema.len() == 1 {
                        let storage_instance = resources::Storage::load(&crud, &storage_schema[0]);
                        match storage_instance.base.resource {
                            Some(ref s) => {
                                let kind = s["kind"].as_str().unwrap();
                                if kind == "NFS".to_string() {
                                    let volume_container_data = serde_json::json!({
                                        "name": format!("dora.volume.{}.{}", volume_workspace, volume_name),
                                        "volumeName": volume_name,
                                        "target": volume_target,
                                        "workspace": volume_workspace,
                                        "storageName": storage_name,
                                        "storage": storage_instance.base.resource.clone(),
                                        "resource": volume,
                                        "policy": v["policy"].as_str().unwrap_or("rw"),
                                        "localPath": v["localPath"].as_str().unwrap_or("null")
                                    }); 
                                    println!("Vol data: {:#?}", volume_container_data);  
                                    volumes_to_attach.push(volume_container_data); 
                                } else {
                                    let volume_container_data = serde_json::json!({
                                        "name": format!("dora.volume.{}.{}", volume_workspace, volume_name),
                                        "volumeName": volume_name,
                                        "target": volume_target,
                                        "workspace": volume_workspace,
                                        "storageName": storage_name,
                                        "storage": storage_instance.base.resource.clone(),
                                        "resource": volume,
                                        "policy": v["policy"].as_str().unwrap_or("rw"),
                                        "localPath": v["localPath"].as_str().unwrap_or("null")
                                    }); 
                                    println!("Vol data: {:#?}", volume_container_data);  
                                    volumes_to_attach.push(volume_container_data);                                     
                                }                                
                            },
                            _ => {}                            
                        } 
                        
                    }
                },
                _ => continue
            }
        } else {
            continue;
        }
    };
    return volumes_to_attach
}

async fn 
create_container_on_node<'a>(
    crud: &'a crud::Crud, 
    workload_type: &str,
    workload: &'a resources::Workload<'a>, 
    node_instance: &'a resources::Node<'a>, 
    nodes_available_resources: &HashMap<String, Vec<String>>,
    container_name: &str) 
{
    let node_observed = node_instance.base.observed.as_ref().unwrap();
    let workload_resource = workload.base.resource.as_ref().unwrap();   
    let workload_zone = &workload.base.p().zone;
    let workload_workspace = &workload.base.p().workspace;
    let workload_id = &workload.base.p().id;
    
    let workload_hash = workload.base.p().resource_hash.as_ref().unwrap(); 

    let node_memory = &node_observed["mem"]["total"];
    let nodecpus = &node_observed["cpuCount"];
    let nodegpus = if node_observed["gpus"].as_array().is_some() { node_observed["gpus"].as_array().unwrap().len() } else { 0 };
    let nodegpukind = &node_observed["gpuKind"];

    // Volumes:
    let volumes = get_volumes_for_container(&crud, &workload).await;
    
    let shm_size = if workload_resource["config"]["shmSize"].as_i64().is_some() {
            workload_resource["config"]["shmSize"].as_i64().unwrap()
    } else {
        if workload_resource["config"]["shmSize"].as_str().is_some() {
            let shm_size_i64 = workload_resource["config"]["shmSize"].as_str().unwrap().parse::<i64>();
            match shm_size_i64 {
                Ok(v) => { v },
                _ => 100000
            }
        } else {
            100000
        }
    };

    let container_computed = match workload_type {
        "CPUWorkload" => {
            let cpus = &nodes_available_resources[&node_instance.base.p().id.to_string()];
            let mut require_millicore = false;
            if cpus.len() == 1 {
                let num = cpus[0].parse::<i64>();
                require_millicore = match num {
                    Ok(_) => false,
                    Err(_) => true
                };       
            }
            let computed = match require_millicore {
                true => {
                    serde_json::json!({
                        "cpus": serde_json::Value::String(cpus[0].clone()),
                        "volumes": volumes,
                        "gpus": (),
                        "mem": (),
                        "gpuKind": nodegpukind,
                        "shmSize": shm_size,
                        "node": node_instance.base.p().name,
                        "nodememory": node_memory,
                        "nodegpus": nodegpus,
                        "nodecpus": nodecpus
                    })
                }, 
                false => {
                    serde_json::json!({
                        "cpus": cpus,
                        "volumes": volumes,
                        "gpus": (),
                        "gpuKind": nodegpukind,
                        "mem": (),
                        "shmSize": shm_size,
                        "node": node_instance.base.p().name,
                        "nodememory": node_memory,
                        "nodegpus": nodegpus,
                        "nodecpus": nodecpus
                    })
                }
            };  
            computed      
        },
        "GPUWorkload" => {
            let gpus = &nodes_available_resources[&node_instance.base.p().id.to_string()];
            serde_json::json!({
                "cpus": [],
                "volumes": volumes,
                "gpus": gpus,
                "gpuKind": nodegpukind,
                "mem": (),
                "shmSize": shm_size,
                "node": node_instance.base.p().name,
                "nodememory": node_memory,
                "nodegpus": nodegpus,
                "nodecpus": nodecpus
            })
        }
        _ => { serde_json::json!({}) } 
    };
        
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
    nodes_available_resources: &mut HashMap<String, Vec<String>>
) -> bool {
    let node_observed_wrapped = &node_instance.base.observed;
    if node_observed_wrapped.is_some() {
        // 1. First check the node resource kind
        let node_observed = node_observed_wrapped.as_ref().unwrap();

        // C P U
        if workload_kind == "CPUWorkload".to_string() {
            
            let mut require_millicore = false;
            let cpu_count = &workload_resource["selectors"]["cpu"]["count"];
            let cpu_kind = &workload_resource["selectors"]["cpu"]["product_name"];
            let node_cpus = &node_observed["cpus"];
            let node_cpus_length = node_cpus.as_array().unwrap().len();

            // Return if the node hasn't the min quantity of cpu requested //cpu_count.parse::<i64>().is_ok() &&
            if cpu_count.as_i64().is_some() && (node_cpus_length as i64) < cpu_count.as_i64().unwrap() {
                return false
            }  
            
            if !cpu_count.as_i64().is_some() {
                require_millicore = true;
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
                        let mut total_number_of_cpus_used = 0.0;
                        // TODO: add support for millicores!!
                        let mut total_cores_used: f64 = 0.0;
                        let mut millicore: f64 = 0.0;
                        for container_on_node in containers_on_node.iter() {
                            let c = resources::Container::load(&crud, container_on_node);
                            let c_cpus = &c.base.computed.as_ref().unwrap()["cpus"];
                            let cpu_str_clone = c_cpus.clone();
                            let mut vec_cpu = vec![]; 
                            let c_cpus_ary_original = match c_cpus.as_array() {
                                // c_cpus is an array
                                Some(_) => c_cpus.as_array().unwrap(),
                                // c_cpus is a string, to transform in array
                                _ => { 
                                    vec_cpu = vec![cpu_str_clone]; 
                                    &vec_cpu
                                }
                            };
                            let c_cpus_ary_original = c_cpus_ary_original.to_vec();
                            let mut c_cpus_ary: Vec<String> = vec![];
                            for cpu in c_cpus_ary_original.iter() {           
                                let num = cpu.as_str();
                                match num {
                                    Some(n) => c_cpus_ary.push(n.to_string()),
                                    _ => {
                                            let num_i64 = cpu.as_i64();
                                            match num_i64 {
                                                Some(n_i64) => c_cpus_ary.push(n_i64.to_string()),
                                                _ => println!("ERROR, not CPU right parsing {:#?}", cpu)
                                            }
                                            
                                        },
                                }
                            }
                            for cpu in c_cpus_ary.iter() {                                
                                let num = cpu.parse::<i64>();//cpu.as_str().unwrap().parse::<i64>();
                                match num {
                                    Ok(cpup) => {
                                        total_cores_used = total_cores_used + 1.0;
                                        used_cpus_map.push(cpup.clone().to_string());                                        
                                    },
                                    Err(_) => {                                        
                                        //let cpu_last = cpu.as_str().unwrap().chars().last();
                                        let cpu_last = cpu.chars().last() ;
                                        if cpu_last.is_some() {
                                            let cpu_last_un = cpu_last.unwrap();
                                            if cpu_last_un.to_string() == "m".to_string() {
                                                //millicore = get_milli_cores_from_cpu(&cpu.as_str().unwrap()).parse().unwrap();
                                                millicore = get_milli_cores_from_cpu(&cpu).parse().unwrap();
                                                total_cores_used = total_cores_used + (millicore / 1000.0);
                                            } else {
                                                return false
                                            }
                                        } else {
                                            return false
                                        }
                                    }
                                }                                

                            }
                            //total_number_of_cpus_used = total_number_of_cpus_used  + c_cpus_ary.len();
                            total_number_of_cpus_used = total_cores_used;
                        }
                        
                        if require_millicore == false {
                            if (total_number_of_cpus_used as i64) + cpu_count.as_i64().unwrap() <= (node_cpus_length as i64) {
                                let mut available_cpus = vec![];
                                for i in 0..node_cpus_length {
                                    if !used_cpus_map.contains(&i.to_string()) {                                    
                                        available_cpus.push(i.to_string());
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
                        } else {
                            if (total_number_of_cpus_used) + (millicore / 1000.0) <= (node_cpus_length as f64) {
                                nodes_available_resources.insert(node_instance.base.p().id.to_string(), vec![cpu_count.as_str().unwrap().to_string()]);
                                return true
                            } else {
                                return false
                            }
                        }                    
                }
            }
        } else { 
            // G P U
            let gpu_count = match &workload_resource["selectors"]["gpu"]["count"].as_i64() {
                Some(r) => *r as i64,
                _ => workload_resource["selectors"]["gpu"]["count"].as_str().unwrap().parse::<i64>().unwrap()
            };            
            //let gpu_count = &workload_resource["selectors"]["gpu"]["count"] 
            let gpu_kind = &workload_resource["selectors"]["gpu"]["product_name"];
            let node_gpus = &node_observed["gpus"];
            let node_gpus_length = node_gpus.as_array().unwrap().len();
            println!("Node gpus length: {}", node_gpus_length);
            if node_gpus_length == 0 {
                return false
            }

            // Return if the node hasn't the min quantity of gpu requested 
            if (node_gpus_length as i64) < gpu_count {
                return false
            }  

            let node_gpu_kind = if node_gpus_length > 0 {
                node_gpus[0]["product_name"].as_str().unwrap()
            } else {
                "None"
            };   
            
            println!("NODE gpu kind: {}", node_gpu_kind);

            /////////////////////////////////////
            let mut ary_kind: Vec<String> = Vec::new();
            if gpu_kind.as_array() != None {
                println!("Required hardware {} array {}", gpu_kind, gpu_count);
                ary_kind = gpu_kind.as_array().unwrap().to_vec().iter().map(|x| x.as_str().unwrap().to_string()).collect::<Vec<_>>();
            } else if gpu_kind.as_str() != None {
                println!("Required hardware {} string {}", gpu_kind, gpu_count);
                if gpu_kind.as_str().unwrap() == "All" {
                    ary_kind = vec![node_gpu_kind.to_string()];
                } else {
                    ary_kind = vec![gpu_kind.as_str().unwrap().to_string()];
                }
            }
            let mut used_gpus_map = vec![];
            
            if ary_kind.iter().any(|i| i== &node_gpu_kind.to_string()) {
                let containers_on_node = &node_instance.get_containers().await;
                if containers_on_node.is_ok() {
                    let containers_on_node = containers_on_node.as_ref().unwrap();
                        let mut total_number_of_gpus_used = 0.0;
                        // TODO: transform this to i64
                        let mut total_gpu_used: f64 = 0.0;
                        for container_on_node in containers_on_node.iter() {
                            let c = resources::Container::load(&crud, container_on_node);
                            let c_gpus = &c.base.computed.as_ref().unwrap()["gpus"];
                            let gpu_str_clone = c_gpus.clone();
                            let mut vec_gpu = Vec::new(); 
                            let c_gpus_ary_original = match c_gpus.as_array() {
                                // c_gpus is an array
                                Some(_) => c_gpus.as_array().unwrap(),
                                // c_gpus is a string, to transform in array
                                _ => { 
                                    vec_gpu = vec![gpu_str_clone]; 
                                    &vec_gpu
                                }
                            };
                            let c_gpus_ary_original = c_gpus_ary_original.to_vec();
                            let mut c_gpus_ary: Vec<String> = vec![];
                            for gpu in c_gpus_ary_original.iter() {           
                                let num = gpu.as_str();
                                match num {
                                    Some(n) => c_gpus_ary.push(n.to_string()),
                                    _ => {
                                            let num_i64 = gpu.as_i64();
                                            match num_i64 {
                                                Some(n_i64) => c_gpus_ary.push(n_i64.to_string()),
                                                _ => println!("ERROR, not CPU right parsing {:#?}", gpu)
                                            }
                                            
                                        },
                                }
                            }

                            for gpu in c_gpus_ary.iter() {                                
                                let num = gpu.parse::<i64>();//.unwrap().parse::<i64>();
                                match num {
                                    Ok(gpup) => {
                                        total_gpu_used = total_gpu_used + 1.0;
                                        used_gpus_map.push(gpup.clone().to_string());                                        
                                    },
                                    Err(_) => {}
                                }                                
            
                            }
                            total_number_of_gpus_used = total_gpu_used;
                        }
                        println!("USED gpus {:#?}/{}", total_number_of_gpus_used, node_gpus_length);
                        
                        if (total_number_of_gpus_used as i64) + gpu_count <= (node_gpus_length as i64) {
                            let mut available_gpus = vec![];
                            for i in 0..node_gpus_length {
                                if !used_gpus_map.contains(&i.to_string()) {                                    
                                    available_gpus.push(i.to_string());
                                }
                                if available_gpus.len() == (gpu_count as usize) {
                                    break
                                }
                            }
                            nodes_available_resources.insert(node_instance.base.p().id.to_string(), available_gpus);                            
                            return true
                        } else {
                            //return true
                            return false
                        }
                                           
                }
            ////////////////////////////////////
            }
        }
    }
    return false
}

pub async fn 
to_node<'a>(crud: &'a crud::Crud, zone: &str, workload: &'a resources::Workload<'a>, container_name: &str) {
    let mut suitable_nodes = Vec::new();
    let r = workload.base.resource.as_ref().unwrap();
    let workload_affinity_strategy = &r["config"]["affinity"];
    let cpu_selector = &r["selectors"]["cpu"];
    let gpu_selector = &r["selectors"]["gpu"];
    let node_selector = &r["selectors"]["node"];
    let mut node_selector_name = "";

    let workload_type: String = match cpu_selector {
        serde_json::Value::Object(_v) => "CPUWorkload".to_string(),
        serde_json::Value::Null => "GPUWorkload".to_string(),
        _ => "CPUWorkload".to_string()
    };
    let has_node_selector: bool = match node_selector {
        serde_json::Value::Object(_v) => {
            match &_v["name"] {
                serde_json::Value::String(_vn) => { 
                    node_selector_name = _vn;
                    true
                },
                _ => false
            }
        },
        serde_json::Value::Null => false,
        _ => false
    };    

    println!("Requires {} node", workload_type);

    // We will save here the node available resource
    let mut nodes_available_resources: HashMap<String, Vec<String>> = HashMap::new();

    // 0. Get a subset (TODO) of zone nodes
    let nodes: Box<Vec<crud::ZonedResourceSchema>> = crud.get_nodes_subset(zone).await.unwrap();

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
    
    if has_node_selector {
        // If the workload has node selector,
        // check if that node is inside suitable nodes
        println!("HAS NODE SELECTOR");
        let mut found_idx = 0;
        let mut found = false; 
        for node in suitable_nodes.iter() {
            if node.base.p.unwrap().name == node_selector_name {
                found = true;
                break;
            } 
            found_idx += 1;
        }
        if found {
            selected_node = Some(&suitable_nodes[found_idx]);
        }
    } else {
        // TODO, compute affinity
        if workload_affinity_strategy.to_string() == "First".to_string() {
            selected_node = Some(&suitable_nodes[0]);
        } else if workload_affinity_strategy.to_string() == "Random".to_string() {
            let num = rand::thread_rng().gen_range(0..suitable_nodes.len());
            selected_node = Some(&suitable_nodes[num]);
        } else if workload_affinity_strategy.to_string() == "Distribute".to_string() {
            selected_node = Some(&suitable_nodes[0]);
        } else if workload_affinity_strategy.to_string() == "Fill".to_string() {
            selected_node = Some(&suitable_nodes[0]);
        } else {
            selected_node = Some(&suitable_nodes[0]);         
        }
    }
    if selected_node.is_some() {
        println!("Final Node {:#?}", selected_node.unwrap().base.p().name);
        create_container_on_node(&crud, &workload_type, &workload, &selected_node.unwrap(), &nodes_available_resources, &container_name).await;
    }  
} 

