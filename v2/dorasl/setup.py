import pathlib
from setuptools import setup
HERE = pathlib.Path(__file__).parent
README = (HERE / "README.md").read_text()

setup(
  name="dorasl",
  version="0.1.1",
  description="",
  long_description=README,
  long_description_content_type="text/markdown",
  author="Amedeo Setti",
  author_email="amedeosetti@gmail.com",
  license="MIT",
  packages=["dorasl"],
  zip_safe=False
)

#import pathlib
#from setuptools import setup
#
## The directory containing this file
#HERE = pathlib.Path(__file__).parent
#
## The text of the README file
#README = (HERE / "README.md").read_text()
#
## This call to setup() does all the work
#setup(
#    name="dora-serverless",
#    version="0.1.0",
#    description="Dora cluster serverless facility",
#    long_description=README,
#    long_description_content_type="text/markdown",
#    url="https://github.com/adda25/dora",
#    author="Amedeo Setti",
#    author_email="amedeosetti@gmail.com",
#    license="MIT",
#    classifiers=[
#        "License :: OSI Approved :: MIT License",
#        "Programming Language :: Python :: 2",
#        "Programming Language :: Python :: 3",
#        "Programming Language :: Python :: 3.6",
#        "Programming Language :: Python :: 3.7",
#    ],
#    package_dir={'':'dora/src'},
#    py_modules=["dora"],
#    include_package_data=True,
#    install_requires=[]
#)