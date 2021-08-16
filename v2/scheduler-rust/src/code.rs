
fn sqr (x: f64) -> f64 {
    return x * x;
}

fn mod_sqr (x: &mut f64) {
	*x += 1.0
}

fn pic () {
    let x = 2.0 * std::f64::consts::PI;

    let abs_difference = (x.cos() - 1.0).abs();

    assert!(abs_difference < 1e-10);	
}

fn sum(values: &[i32]) -> i32 {
    let mut res = 0;
    for i in 0..values.len() {
        res += values[i]
    }
    res
}

fn vec_ex () {
    let mut v1 = vec![1, 10, 5, 1, 2, 11, 2, 40];
    v1.sort();
    v1.dedup();
    assert_eq!(v1, &[1, 2, 5, 10, 11, 40]);	
}

fn main() {
    let answer = 42;
    println!("Hello {}", answer);
    assert_eq!(answer, 42);
    for i in 0..5 {
    	let mut c = i as f64;
    	mod_sqr(&mut c);
        println!("So {} and {}", sqr(i as f64), c);
    }    
    pic();
    println!("-> {}", sum(&[1,2]));

    let arr = [10, 20, 30];
    for i in arr.iter() {
        println!("{}", i);
    }

    let sum: i64 = [10, 20, 30].iter().sum();
    println!("sum was {}", sum);

    let mut v1 = vec![10, 20, 30, 40];
    v1.pop();

    println!("L {:?}", v1);   

    vec_ex();         
}