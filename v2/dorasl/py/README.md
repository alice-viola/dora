# Dora Serverless Py 

A Python module in order to deploy your experiment on Dora cluster
from your code!

**Requires dora.cli installed on your PC**


## Build

pip install twine
python3 setup.py sdist bdist_wheel

## Check

twine check dist/*

## Upload test

twine upload --repository-url https://test.pypi.org/legacy/ dist/*

## Install test

pip install -i https://test.pypi.org/simple/ dora-serverless==0.1.1

## Upload prod

twine upload dist/*