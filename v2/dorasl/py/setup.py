import pathlib
from setuptools import setup
HERE = pathlib.Path(__file__).parent
README = (HERE / "README.md").read_text()

setup(
  name="dorasl",
  version="0.1.5",
  description="",
  long_description=README,
  long_description_content_type="text/markdown",
  author="Amedeo Setti",
  author_email="amedeosetti@gmail.com",
  license="MIT",
  packages=["dorasl"],
  zip_safe=False
)