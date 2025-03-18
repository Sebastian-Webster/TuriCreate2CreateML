# TuriCreate2CreateML

Have a Turi Create CSV file that you want to convert to a CreateML JSON file? This is the place for you!

## Requirements:

Node.js 15.0.0+ or Bun 1.0+

## Command line questions

- ```Input file```: This is asking you for the path of the Turi Create CSV file
- ```Output file```: This is asking you where you want the output CreateML JSON file to go
- ```Media folder```: The folder for a CreateML project should have an annotations.json file and then a folder with your images in it. This question is asking you what the name of the folder with the images will be. Do not provide a full path here; just the name of the images folder.
- ```Check image path existence```: This is asking you if the program should check if the images listed in the CSV folder exist where it says they exist
- ```Exclude missing paths from output```: This is only asked if the image path existence question is answer with a ```y```. This is asking if the missing images should be excluded from the JSON output. If ```y``` is answered, then the images will be ignored. If ```n``` is answered, the program will exit with status code 1 if a non-existent image path is encounter.