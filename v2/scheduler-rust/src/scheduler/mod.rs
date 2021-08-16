//use crate::crud::Crud;

pub struct ReplicaController/*<'a>*/  {
    //crud: &'a crud::Crud
}

impl ReplicaController {
    pub fn new(/*crud: &'a  crud::Crud*/) -> ReplicaController {
        //ReplicaController{crud: crud}
        ReplicaController{}
    }

    pub fn run(&self) {
        println!("Running replica controller");
    }
}