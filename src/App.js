import React from 'react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Link, Switch, Route } from 'react-router-dom';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import Webcam from 'react-webcam';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';

let initImages = [];

const initialPrompts = [
  { name: "disco night, 70s movie, disco costume, alice in wonderland"},
  { name: "simpstyle, Very detailed, clean, high quality, sharp image"},
  { name: "Barbie, plastic doll, blue eyes"},
  { name: "grimm's tales"},
  { name: "anime artwork Miyazaki anime style, key visual, vibrant, studio anime, highly detailed"},
  { name: "People made of smoke, black and white colors, perfect gradient, 8k, ultra detailed, ray tracing,perfect lights, black eyes, Vibrant, beautiful, painterly, detailed, textural, artistic"},
  { name: "pixel art, pixelated, 16bit"},
  { name: "RAW photo, subject, 8k uhd, dslr, soft lighting, high quality, clearly face, an expressive portrait of a musician lost in the magic of their music, capturing their passion"},
  { name: "snow white,  anime artwork, drawing"},
  { name: "Steampunk"},
  { name: "Woodstock, hippie festival"},
  { name: "Heroic fantasy, illustrative, painterly, matte painting, highly detailed"},
  { name: "people in a suit with a tie, cinematic photo, 35mm photograph, film, bokeh, professional, 4k, highly detailed"},
  { name: "A black and white vintage, timeworn family photograph from 1890, rural clothing, ultra-detailed, 8k, slightly sepia tone"},
  { name: "a black and white photo, in the style of Studio Harcourt, featured on cg society, studio portrait"},
  { name: "RAW photo, subject, 8k uhd, dslr, soft lighting, high quality, clearly face, a portrait of a regal monarch, adorned with intricate jewelry and an air of authority"},
  { name: "Gangsters in a new york street,godfather, analog film photo, faded film, desaturated, 35mm photo, grainy, vignette, vintage, Kodachrome, Lomography, stained, highly detailed, found footage"},
  { name: "black & white, Jacques Tati"},
  { name: "Zombies"},
  { name: "The mask movie"},
  { name: "Flowers, photo by James C. Leyendecker, studio portrait, dynamic pose, national geographic photo, retrofuturism, biomorphic"},
  { name: "RAW photo, subject, 8k uhd, dslr, soft lighting, high quality, clearly face, a futuristic visage with cybernetic enhancements seamlessly integrated into human features"},
  { name: "naked under the shower"},
  { name: "swap faces"},
  { name: "Las vegas parano, vhs, psychedelic, Kodachrome"},
  { name: "Star wars jedi, cinematic film still, shallow depth of field, vignette, highly detailed, high budget Hollywood movie, bokeh, cinemascope, moody, epic, gorgeous, film grain, grainy"},
  { name: "closeup portrait of Persian, royal clothing, makeup, jewelry, wind-blown, symmetric, desert, ((sands, dusty and foggy, sand storm, winds)) bokeh, depth of field, centered"},
  { name: "RAW photo, subject, 8k uhd, dslr, soft lighting, high quality, clearly face, an exquisite portrait of a serene face, capturing the essence of tranquility and inner peace"},
]

const initialLoras = [
  {
    enabled: false,
    name: "Harry Dwarf Character",
    prompt: "Harry_Dwarf, dwarf-like character, flowing long red beard, braided moustache,bald , <lora:Harry_Dwarf:1>",
    weight: 0.8,
    civitai_id: 175818,
    civitai_version: "Harry Dwarf v1.1",
  },
  {
    enabled: false,
    name: "Graphic Portrait",
    prompt: "<lora:Graphic_Portrait:1>, (a drawing:1) of ",
    weight: 0.8,
    civitai_id: 170039,
    civitai_version: "SDXL v1.0",
  },
  {
    enabled: false,
    name: "MS Paint Portraits",
    prompt: "MS Paint Portraits of ",
    weight: 0.8,
    civitai_id: 183354,
    civitai_version: "v1.0",
  },
  {
    enabled: false,
    name: "Lego",
    prompt: "LEGO BrickHeadz, ",
    weight: 0.8,
    civitai_id: 92444,
    civitai_version: "V2.0_SDXL1.0",
  },
  {
    enabled: false,
    name: "PixelArt",
    prompt: "pixelart",
    weight: 0.8,
    civitai_id: 120096,
    civitai_version: "v1.1",
  },
]

const initialFormOptions = [
  {
    name: "lora",
    content: initialLoras
  }
]

const initialRanges = [
  {
    name: "prompt",
    selected: Math.floor(Math.random() * initialPrompts.length),
    content: initialPrompts
  }
]

function App() {

  const webcamRef = useRef(null);

  const [resultImages, setResultImages] = useState(initImages);
  const [ranges, setRanges] = useState(initialRanges);
  const [formOptions, setFormOptions] = useState(initialFormOptions);
  const [selectedRange, setSelectedRange] = useState(0);

  const rangePrompt = ranges.find(r => r.name === "prompt")
  const [currentPrompt, setCurrentPrompt] = useState(
    rangePrompt.content[rangePrompt.selected].name
  );

  const handleRangeChange = useCallback((rangeName, contentIndex) => {
    const nextRanges = ranges.map(range => {
      if (range.name === rangeName) {

        if (range.name === "prompt") {
          const promptContent = range.content[contentIndex];
          setCurrentPrompt(promptContent.name);
        }

        return Object.assign(
          range,
          { selected: contentIndex }
        );
      } else {
        return range;
      }
    });

    setRanges(nextRanges);
  }, [ranges]);

  const handleFormOptionsChange = useCallback((event, optionName, contentName) => {
    const nextFormOptions = formOptions.map((option, i) => {
      if (option.name === optionName) {
        return Object.assign(
          option,
          { content: option.content.map((content, j) => {
            if (content.name === contentName) {
              return Object.assign(
                content,
                { enabled: !content.enabled }
              );
            } else {
              return content;
            }
          })}
        );
      } else {
        return option;
      }
    });

    setFormOptions(nextFormOptions);
  }, [formOptions]);

  const handleRandomizeRanges = useCallback(() => {
    const nextRanges = ranges.map(range => {

      const randomIndex = Math.floor(
        Math.random() * range.content.length
      );

      if (range.name === "prompt") {
        const promptContent = range.content[randomIndex];
        setCurrentPrompt(promptContent.name);
      }

      return Object.assign(
        range,
        { selected: randomIndex }
      );
    });
    setRanges(nextRanges);
  }, [ranges]);

  const handleRandomizeOptions = useCallback(() => {
    const nextOptions = formOptions.map(option => {
      return Object.assign(
        option,
        { content: option.content.map(content => {
          return Object.assign(
            content,
            { enabled: (Math.random() < 0.5) }
          );
        })}
      );
    });
    setFormOptions(nextOptions);
  }, [formOptions]);

  const handleRandomize = useCallback(() => {
    handleRandomizeRanges();
    handleRandomizeOptions();
  }, [handleRandomizeRanges, handleRandomizeOptions]);

  const isProcessing = resultImages.find(image => image.isProcessing);

  const takeScreenshot = useCallback(() => {

    if (isProcessing) return;

    const lora_option = formOptions.find(r => r.name === "lora")
    const loras = lora_option.content.filter(l => l.enabled)

    const screenshot = webcamRef.current.getScreenshot();
    const prompt = loras.map(l => l.prompt).join(", ") + " " + currentPrompt;

    const captureImage = {
      id: Date.now(),
      isProcessing: true,
      capture: screenshot,
      result: "processing.jpg",
      prompt: prompt,
      loras: loras
    }

    setResultImages([
      captureImage,
      ...resultImages
    ]);

  }, [
    isProcessing,
    formOptions,
    currentPrompt,
    resultImages
  ])

  useEffect(() => {

    const onKeydown = (event) => {

      // if (event.key === "ArrowUp") {

      //   event.preventDefault()
      //   setSelectedRange(selectedRange === 0 ?
      //                   0 : (selectedRange - 1))

      // } else if (event.key === "ArrowDown") {

      //   event.preventDefault()
      //   setSelectedRange(selectedRange === (ranges.length - 1) ?
      //                   selectedRange : (selectedRange + 1))

      // } else if (event.key === "ArrowLeft") {

      //   const range = ranges[selectedRange];
      //   const nextSelected = range.selected === 0 ?
      //         0 : (range.selected - 1)
      //   handleRangeChange(range.name, nextSelected)

      // } else if (event.key === "ArrowRight") {

      //   const range = ranges[selectedRange];
      //   const nextSelected =
      //         range.selected === (range.content.length - 1) ?
      //             range.selected : (range.selected + 1)
      //   handleRangeChange(range.name, nextSelected)

      // }

    }

    window.addEventListener("keydown", onKeydown)

    return () => {
      window.removeEventListener('keydown', onKeydown);
    }
  }, [
    selectedRange,
    ranges,
    takeScreenshot,
    handleRandomize,
    handleRangeChange
  ])

  useEffect(() => {

    const captureImage = resultImages.find(image => image.isProcessing);
    if (captureImage === undefined) return;

    let formData = new FormData();
    formData.append(
      'file',
      captureImage.capture.replace("data:image/jpeg;base64,", "")
    );
    formData.append('prompt', captureImage.prompt);
    formData.append('loras', JSON.stringify(captureImage.loras))

    fetch(`/api/processing`,
        {
          method: 'POST',
          body: formData
        })
    .then(response => {

      if (response.status !== 200)
        throw new Error(`${response.status} - ${response.statusText}`);

      return response.blob()

    })
    .then(result => {

      const nextImages = resultImages.map(image => {
        if (image.isProcessing) {
          return Object.assign(
            image,
            { result: URL.createObjectURL(result) }
          )
        } else {
          return image;
        }
      });
      setResultImages(nextImages)

    })
    .catch(error => {
      console.error('Error:', error);

      const nextImages = resultImages.map(image => {
        if (image.isProcessing) {
          return Object.assign(
            image,
            {
              result: "error.jpg",
              error: error.toString()
            }
          )
        } else {
          return image;
        }
      });
      setResultImages(nextImages)
    })
    .finally(() => {

      const nextImages = resultImages.map(image => {
        if (image.isProcessing) {
          return Object.assign(
            image,
            { isProcessing: false }
          )
        } else {
          return image;
        }
      });
      setResultImages(nextImages)

    });
  }, [resultImages])

  return (
    <div className="App">
      <BrowserRouter>
        <Switch>
          <Route exact path="/">
            <Container fluid>

              <Row className="m-4">
                <Col sm="3">
                  <Card style={{ width: '18rem' }}>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      width={286}
                      height={214}
                      className="card-img-top"
                    />
                    <Card.Body>
                      { ranges.map((range, rangeIndex) => (
                        <div key={range.name}>
                          <Form.Range
                            min={0}
                            value={range.selected}
                            max={range.content.length - 1}
                            step={1}
                            disabled={selectedRange !== rangeIndex}
                            onChange={(event) =>
                              handleRangeChange(
                                range.name,
                                parseInt(event.target.value)
                              )
                            }
                            onClick={() => setSelectedRange(rangeIndex)}
                          />
                        </div>
                      ))}
                      <Form.Control
                        as="textarea"
                        placeholder="Leave a prompt here"
                        value={currentPrompt}
                        style={{ height: '120px' }}
                        onChange={(event) =>
                          setCurrentPrompt(event.target.value)
                        }
                      />
                      { formOptions.map((option, optionIndex) => (
                        <div
                          key={option.name}
                        >
                          { option.content.map((content, contentIndex) => {
                              return (
                                <Button key={content.name}
                                        size="sm"
                                        variant={
                                          content.enabled ?
                                          "primary" :
                                          "secondary"
                                        }
                                        className="me-2 mt-2"
                                        onClick={(e) =>
                                          handleFormOptionsChange(
                                            e,
                                            option.name,
                                            content.name
                                          )
                                        }
                                >
                                  {content.name}
                                </Button>
                              )
                            })
                          }
                        </div>
                      ))}
                      <div className="mt-4">
                        <Button
                          onClick={handleRandomize}
                          variant="secondary"
                          className="me-2"
                        >
                          Randomize
                        </Button>
                        <Button
                          onClick={takeScreenshot}
                          variant="primary"
                          disabled={isProcessing}
                        >
                        { isProcessing ?
                          "Processing..."
                          :
                          "Capture"
                        }
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col sm="9">
                  <Row xs={1} md={3} className="g-4">
                  { resultImages.map((image, index) => (
                    <Col key={image.id}>
                      <Card style={{ width: '18rem' }}>
                        <Card.Img variant="top" src={image.capture} />
                        <Card.Img variant="bottom" src={image.result} />
                        <Card.Body>
                          { image.isProcessing && (
                              <Spinner
                                as="span"
                                animation="border"
                                role="status"
                                aria-hidden="true"
                              >
                                <span className="visually-hidden">Loading...</span>
                              </Spinner>
                          )}
                          { image.error && (
                              <Card.Text>{image.error}</Card.Text>
                          )}
                          <Card.Text>{image.prompt}</Card.Text>
                          { image.loras.map(lora => {
                              return (
                                <Button key={lora.name}
                                        size="sm"
                                        variant="primary"
                                        className="mt-2 me-2"
                                >
                                  {lora.name}
                                </Button>
                              )
                            })
                          }
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                  </Row>
    
            </Col>
              </Row>

            </Container>
          </Route>
        </Switch>
        <div>
          <Link className="App-link" to="https://github.com/alx/react-flask-sd">
          react-flask-sd
          </Link>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;
