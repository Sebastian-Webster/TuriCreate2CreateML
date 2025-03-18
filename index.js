const readline = require('readline');
const fs = require('fs');
const fsPromises = require('fs/promises')
const pathModule = require('path')

const commandLineInput = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function promisifiedQuestion(question) {
    return new Promise(resolve => {
        commandLineInput.question(question, answer => resolve(answer))
    })
}

function promisifiedStreamWrite(write, stream) {
    return new Promise(resolve => {
        stream.write(write, 'utf8', resolve)
    })
}

const yn = ['y', 'n']

async function main() {
    const inputFile = await promisifiedQuestion('Please enter the path to the input file... ')
    const outputFile = await promisifiedQuestion('Please enter the path to the output file... ')
    const mediaFolderName = await promisifiedQuestion('What will the media folder name be? ')
    const checkPathsExistAnswer = (await promisifiedQuestion('Would you like the program to check if the image paths exist? (y/n) ')).toLowerCase()
    let ignoreMissingPathsAnswer = ''
    if (checkPathsExistAnswer === 'y') {
        ignoreMissingPathsAnswer = (await promisifiedQuestion('Should missing paths be excluded from the output? y for yes and n for stop the program when a missing image is found. (y/n) ')).toLowerCase()
    }
    commandLineInput.close()

    if (!yn.includes(checkPathsExistAnswer)) {
        throw new Error("Unrecognized answer for checking image paths' existence question. Please use either a 'y' or a 'n'.")
    }

    if (checkPathsExistAnswer === 'y' && !yn.includes(ignoreMissingPathsAnswer)) {
        throw new Error("Unrecognized answer for ignoring missing images question. Please use either a 'y' or a 'n'.")
    }

    const inputPath = pathModule.resolve(inputFile)
    const outputPath = pathModule.resolve(outputFile)

    console.log('Input path:', inputPath)
    console.log('Output path:', outputPath)

    if (!fs.existsSync(inputPath)) {
        throw new Error('Input file cannot be found at specified path')
    }

    const writeStream = fs.createWriteStream(outputFile)

    writeStream.on('error', (err) => {
        console.error('Write stream error:', err)
        process.exit(1)
    })

    await promisifiedStreamWrite('[', writeStream)

    const readStream = fs.createReadStream(inputFile)

    readStream.on('error', (err) => {
        console.error('Read stream error:', err)
        process.exit(1)
    })

    const reader = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity
    })

    let lineCount = 0;
    let missingLineCount = 0;
    let noAnnotationsLineCount = 0;

    for await (const line of reader) {
        lineCount++
        if (lineCount === 1) {
            if (line !== 'path,annotations') {
                throw new Error('The input file does not seem like a TuriCreate CSV file.')
            }

            continue
        }

        const split = line.split(',"')
        if (split.length > 2) {
            throw new Error(`Expecting 1 or 2 columns for line ${lineCount}. Data: ${split}`)
        }

        if (split.length === 1) {
            console.warn('Skipping line', lineCount, 'because there are no annotations.')
            noAnnotationsLineCount++
            continue
        }

        let [path, annotations] = split;

        path = path.replaceAll('"', '')
        annotations = annotations.replaceAll('"', '')
        annotations = annotations.replaceAll("'", '"')

        if (checkPathsExistAnswer === 'y' && !fs.existsSync(path)) {
            if (ignoreMissingPathsAnswer === 'y') {
                console.warn('Skipping missing image at path:', path)
                missingLineCount++
                continue
            }

            throw new Error(`Expecting to find an image at path ${path} but could not find one.`)
        }

        let item = `{"annotations": ${annotations}, "image": "${mediaFolderName}\\/${pathModule.basename(path)}"},`

        await promisifiedStreamWrite(item, writeStream)
    }

    reader.close();
    readStream.close();
    writeStream.close();

    //Remove trailing comma
    const outputSize = (await fsPromises.stat(outputPath)).size
    await fsPromises.truncate(outputPath, outputSize - 1)

    await fsPromises.appendFile(outputPath, ']')

    console.log('Successfully converted a Turi Create CSV file to a CreateML JSON file. Stats...')
    console.log('Output file size:', outputSize)
    console.log('Lines read:', lineCount)
    if (ignoreMissingPathsAnswer === 'y') {
        console.log('Images skipped because they were missing:', missingLineCount)
    }
    console.log('Images skipped because there were no annotations:', noAnnotationsLineCount)
}

main()