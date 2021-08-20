extern crate scylla;
extern crate tokio;
use std::error::Error;
use crate::crud as crud;
use scylla::frame::response::cql_to_rust::FromRow;
use uuid::Uuid;
use std::fmt;
use serde_json::Value as JSONValue;


/**
*   Base component for data
*/
#[derive(Clone)]   
pub struct Base<'a, T> {
    kind: crud::ResourceKind,
    is_zoned: bool,
    is_workspaced: bool,
    interface: &'a crud::Crud,
    pub p: Option<&'a T>,
    pub resource: Option<JSONValue>,
    pub observed: Option<JSONValue>,
    pub computed: Option<JSONValue>,
}

impl<'a, T> Base<'a, T> {

    pub fn p(&self) -> &T {
        self.p.unwrap()
    }    
     
    pub async fn 
    get_by_zone<V: FromRow + fmt::Debug>(&self, zone: &str, name: Option<&str>) 
    -> Result<Box<Vec<V>>, Box<dyn Error>> 
    {
        let mut query = format!("{}{}{}", " AND zone='", zone, "'");
        if name.is_some() {
            query = format!("{}{}{}{}", query, " AND name='", name.unwrap(),"'");
        }        
        let result: Box<Vec<V>> = 
            self.interface.read(&self.kind, Option::Some(&query.to_string())).await?;
        Ok(result)
    }      

    pub async fn 
    _get_by_workspace(&self, workspace: &str, name: Option<&str>) 
    -> Result<Box<Vec<crud::WorkspacedResourceSchema>>, Box<dyn Error>> 
    {
        let mut query = format!("{}{}{}", " AND workspace='", workspace, "'");
        if name.is_some() {
            query = format!("{}{}{}{}", query, " AND name='", name.unwrap(),"'");
        }        
        let result: Box<Vec<crud::WorkspacedResourceSchema>> = 
            self.interface.read(&self.kind, Option::Some(&query.to_string())).await?;
        Ok(result)
    } 
    
    pub async fn 
    _get_by_zone_and_workspace(&self, zone: &str, workspace: &str, name: Option<&str>) 
    -> Result<Box<Vec<crud::ZonedWorkspacedResourceSchema>>, Box<dyn Error>> 
    {
        let mut query = format!("{}{}{}{}{}", " AND zone='", zone, "' AND workspace='", workspace, "'");
        if name.is_some() {
            query = format!("{}{}{}{}", query, " AND name='", name.unwrap(),"'");
        }
        let result: Box<Vec<crud::ZonedWorkspacedResourceSchema>> = 
            self.interface.read(&self.kind, Option::Some(&query.to_string())).await?;
        Ok(result)
    } 
    
    pub async fn 
    get_by_zone_and_workspace_and_name(&self, zone: &str, workspace: &str, name: &str) 
    -> Result<Box<Vec<crud::ZonedWorkspacedResourceSchema>>, Box<dyn Error>> 
    {
        let query = format!("{}{}{}{}{}{}{}", " AND zone='", zone, "' AND workspace='", workspace, "' AND name='", name, "'");    
        let result: Box<Vec<crud::ZonedWorkspacedResourceSchema>> = 
            self.interface.read(&self.kind, Option::Some(&query.to_string())).await?;
        Ok(result)
    }     
}

//  _   _           _      
// | \ | | ___   __| | ___ 
// |  \| |/ _ \ / _` |/ _ \
// | |\  | (_) | (_| |  __/
// |_| \_|\___/ \__,_|\___|
//  
#[derive(Clone)]                       
pub struct Node<'a> { pub base: Base<'a, crud::ZonedResourceSchema> }

impl <'a> Node<'a> {

    pub fn load(crud_facility: &'a crud::Crud, p: &'a crud::ZonedResourceSchema) -> Self {
        Node{base: 
            Base{
                interface: crud_facility, 
                is_zoned: true, 
                is_workspaced: false, 
                kind: crud::ResourceKind::Node,
                p: Some(p),
                resource: Some(serde_json::from_str(p.resource.as_ref().unwrap()).unwrap()),
                observed: if p.observed.is_some()  {
                    Some(serde_json::from_str(p.observed.as_ref().unwrap()).unwrap())
                } else { 
                    Option::None 
                },
                computed: if p.computed.is_some()  {
                    Some(serde_json::from_str(p.computed.as_ref().unwrap()).unwrap())
                } else { 
                    Option::None 
                }
            }
        }
    }  
    
    pub async fn get_containers(&self) -> Result<Box<Vec<crud::ContainerSchema>>, Box<dyn Error>> {
        Ok(self.base.interface.get_containers_by_node_id(&self.base.p().id).await?)
    }
}


// __        __         _    _                 _ 
// \ \      / /__  _ __| | _| | ___   __ _  __| |
//  \ \ /\ / / _ \| '__| |/ / |/ _ \ / _` |/ _` |
//   \ V  V / (_) | |  |   <| | (_) | (_| | (_| |
//    \_/\_/ \___/|_|  |_|\_\_|\___/ \__,_|\__,_|
//                                               
pub struct Workload<'a> { 
    pub base: Base<'a, crud::ZonedWorkspacedResourceSchema>,
    pub action_id: Option<Uuid> 
}

impl <'a> Workload<'a> {

    pub fn common(&self) -> &Base<'a, crud::ZonedWorkspacedResourceSchema> {
        &self.base
    }    

    pub fn new(crud_facility: &'a crud::Crud) -> Self {
        Workload{base: 
            Base{
                interface: crud_facility, 
                is_zoned: true, 
                is_workspaced: false, 
                kind: crud::ResourceKind::Workload,
                p: Option::None,
                resource: Option::None,
                observed: Option::None,
                computed: Option::None,
            },
            action_id: Option::None
        }
    }

    pub fn load(crud_facility: &'a crud::Crud, p: &'a crud::ZonedWorkspacedResourceSchema, action_id: Option<Uuid>) -> Self {
        Workload{base: 
            Base{
                interface: crud_facility, 
                is_zoned: true, 
                is_workspaced: false, 
                kind: crud::ResourceKind::Workload,
                p: Some(p),
                resource: Some(serde_json::from_str(p.resource.as_ref().unwrap()).unwrap()),
                observed: if p.observed.is_some() { Some(serde_json::from_str(p.observed.as_ref().unwrap()).unwrap()) } else { Option::None },
                computed: Option::None,
            },
            action_id: action_id
        }
    }    
}

//  ____            _        _                 
// / ___|___  _ __ | |_ __ _(_)_ __   ___ _ __ 
// | |   / _ \| '_ \| __/ _` | | '_ \ / _ \ '__|
// | |__| (_) | | | | || (_| | | | | |  __/ |   
// \____\___/|_| |_|\__\__,_|_|_| |_|\___|_|   
//                                           
pub struct Container<'a> { pub base: Base<'a, crud::ContainerSchema> }

impl <'a> Container<'a> {

    pub fn new(crud_facility: &'a crud::Crud) -> Self {
        Container{base: 
            Base{
                interface: crud_facility, 
                is_zoned: true, 
                is_workspaced: true, 
                kind: crud::ResourceKind::Container,
                p: Option::None,
                resource: Option::None,
                observed: Option::None,
                computed: Option::None,
            }
        }
    }

    pub fn load(crud_facility: &'a crud::Crud, p: &'a crud::ContainerSchema) -> Self {
        Container{base: 
            Base{
                interface: crud_facility, 
                is_zoned: true, 
                is_workspaced: true, 
                kind: crud::ResourceKind::Container,
                p: Some(p),
                resource: Some(serde_json::from_str(p.resource.as_ref().unwrap()).unwrap()),
                observed: if p.observed.is_some() { Some(serde_json::from_str(p.observed.as_ref().unwrap()).unwrap()) } else { Option::None },
                computed: if p.computed.is_some() { Some(serde_json::from_str(p.computed.as_ref().unwrap()).unwrap()) } else { Option::None },
            }
        }
    } 

    pub async fn 
    get_by_workload_id<V: FromRow + fmt::Debug>(&self, workload_id: &Uuid) 
    -> Result<Box<Vec<V>>, Box<dyn Error>> 
    {
        let result: Box<Vec<V>> = 
            self.base.interface.get_containers_by_workload_id(workload_id).await?;
        Ok(result)
    }  
      
}

//     _        _   _             
//    / \   ___| |_(_) ___  _ __  
//   / _ \ / __| __| |/ _ \| '_ \ 
//  / ___ \ (__| |_| | (_) | | | |
// /_/   \_\___|\__|_|\___/|_| |_|
//                             
pub struct Action<'a> { pub base: Base<'a, crud::ActionSchema> }

impl <'a> Action<'a> {
    pub fn new(crud_facility: &'a crud::Crud) -> Self {
        Action{base: 
            Base{
                interface: crud_facility, 
                is_zoned: true, 
                is_workspaced: false, 
                kind: crud::ResourceKind::Action,
                p: Option::None,
                resource: Option::None,
                observed: Option::None,
                computed: Option::None,
            }
        }
    }

    pub async fn 
    get<V: FromRow + fmt::Debug>(&self, zone: &str, resource_kind: &str, destination: &str) 
    -> Result<Box<Vec<V>>, Box<dyn Error>> 
    {
        let result: Box<Vec<V>> = 
            self.base.interface.read_actions(zone, resource_kind, destination).await?;
        Ok(result)
    }         
}