extern crate scylla;
extern crate tokio;
use std::error::Error;
use crate::crud as crud;
use scylla::{Session};
use scylla::frame::value::Timestamp;
use scylla::macros::FromRow;
use scylla::frame::response::cql_to_rust::FromRow;
use uuid::Uuid;
use chrono::Duration;

/**
*   Base component for data
*/
pub struct Base<'a> {
    kind: crud::ResourceKind,
    is_zoned: bool,
    is_workspaced: bool,
    interface: &'a crud::Crud
}

impl<'a> Base<'a> {

    pub fn new(crud_facility: &'a crud::Crud) -> Self {
        Base{interface: crud_facility, is_zoned: false, is_workspaced: false, kind: crud::ResourceKind::Zone}
    }

    pub fn kind(&self) -> &crud::ResourceKind {
        &self.kind
    }

    pub fn is_zoned(&self) -> bool {
        self.is_zoned
    }

    pub fn is_workspaced(&self) -> bool {
        self.is_zoned
    }   
    
    pub async fn get(&self) 
    -> Result<Box<Vec<crud::ResourceSchema>>, Box<dyn Error>> 
    {
        let result: Box<Vec<crud::ResourceSchema>> = self.interface.read(&self.kind).await?;
        Ok(result)
    } 
}

pub struct Node<'a> { base: Base<'a> }

impl <'a> Node<'a> {
    pub fn common(&self) -> &Base<'a> {
        &self.base
    }

    pub fn new(crud_facility: &'a crud::Crud) -> Node<'a> {
        Node{base: 
            Base{
                interface: crud_facility, 
                is_zoned: true, 
                is_workspaced: false, 
                kind: crud::ResourceKind::Node
            }
        }
    }
}

pub struct User<'a> { base: Base<'a> }

impl <'a> User<'a> {
    pub fn common(&self) -> &Base<'a> {
        &self.base
    }

    pub fn new(crud_facility: &'a crud::Crud) -> Self {
        User{base: 
            Base{
                interface: crud_facility, 
                is_zoned: true, 
                is_workspaced: false, 
                kind: crud::ResourceKind::User
            }
        }
    }
}