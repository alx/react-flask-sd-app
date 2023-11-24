import React from 'react';
import { useRef, useState, useEffect } from 'react';
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
  "disco night, 70s movie, disco costume, alice in wonderland",
  "simpstyle, Very detailed, clean, high quality, sharp image",
  "Barbie, plastic doll, blue eyes",
  "grimm's tales",
  "anime artwork Miyazaki anime style, key visual, vibrant, studio anime, highly detailed",
  "People made of smoke, black and white colors, perfect gradient, 8k, ultra detailed, ray tracing,perfect lights, black eyes, Vibrant, beautiful, painterly, detailed, textural, artistic",
  "pixel art, pixelated, 16bit",
  "RAW photo, subject, 8k uhd, dslr, soft lighting, high quality, clearly face, an expressive portrait of a musician lost in the magic of their music, capturing their passion",
  "snow white,  anime artwork, drawing",
  "Steampunk",
  "Woodstock, hippie festival",
  "Heroic fantasy, illustrative, painterly, matte painting, highly detailed",
  "people in a suit with a tie, cinematic photo, 35mm photograph, film, bokeh, professional, 4k, highly detailed",
  "A black and white vintage, timeworn family photograph from 1890, rural clothing, ultra-detailed, 8k, slightly sepia tone",
  "a black and white photo, in the style of Studio Harcourt, featured on cg society, studio portrait",
  "RAW photo, subject, 8k uhd, dslr, soft lighting, high quality, clearly face, a portrait of a regal monarch, adorned with intricate jewelry and an air of authority",
  "Gangsters in a new york street,godfather, analog film photo, faded film, desaturated, 35mm photo, grainy, vignette, vintage, Kodachrome, Lomography, stained, highly detailed, found footage",
  "black & white, Jacques Tati",
  "Zombies",
  "The mask movie",
  "Flowers, photo by James C. Leyendecker, studio portrait, dynamic pose, national geographic photo, retrofuturism, biomorphic",
  "RAW photo, subject, 8k uhd, dslr, soft lighting, high quality, clearly face, a futuristic visage with cybernetic enhancements seamlessly integrated into human features",
  "naked under the shower",
  "swap faces",
  "Las vegas parano, vhs, psychedelic, Kodachrome",
  "Star wars jedi, cinematic film still, shallow depth of field, vignette, highly detailed, high budget Hollywood movie, bokeh, cinemascope, moody, epic, gorgeous, film grain, grainy",
  "closeup portrait of Persian, royal clothing, makeup, jewelry, wind-blown, symmetric, desert, ((sands, dusty and foggy, sand storm, winds)) bokeh, depth of field, centered",
  "RAW photo, subject, 8k uhd, dslr, soft lighting, high quality, clearly face, an exquisite portrait of a serene face, capturing the essence of tranquility and inner peace"
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

  const [processingStep, setProcessingStep] = useState(0);
  const [images, setImages] = useState(initImages);
  const [ranges, setRanges] = useState(initialRanges);
  const [selectedRange, setSelectedRange] = useState(0);

  const handleRangeChange = (event, index) => {
    const nextRanges = ranges.map((range, i) => {
      if (i === index) {
        return Object.assign(
          range,
          { selected: parseInt(event.target.value) }
        );
      } else {
        return range;
      }
    });

    setRanges(nextRanges);
  }

  const handleRandomizeRanges = () => {
    const nextRanges = ranges.map(range => {
      return Object.assign(
        range,
        { selected: Math.floor(Math.random() * range.content.length) }
      );
    });
    setRanges(nextRanges);
  }

  useEffect(() => {

    const onKeydown = (event) => {

      if (event.key === "ArrowUp") {

        event.preventDefault()
        setSelectedRange(selectedRange === 0 ?
                        0 : (selectedRange - 1))

      } else if (event.key === "ArrowDown") {

        event.preventDefault()
        setSelectedRange(selectedRange === (ranges.length - 1) ?
                        selectedRange : (selectedRange + 1))

      } else if (event.key === "ArrowLeft") {

        const nextRanges = ranges.map((range, i) => {
          if (i === selectedRange) {
            const nextSelected = range.selected === 0 ?
                  0 : (range.selected - 1)
            return Object.assign(
              range,
              { selected: nextSelected }
            );
          } else {
            return range;
          }
        });
        setRanges(nextRanges);

      } else if (event.key === "ArrowRight") {

        const nextRanges = ranges.map((range, i) => {
          if (i === selectedRange) {
            const nextSelected = range.selected === (range.content.length - 1) ?
                  range.selected : (range.selected + 1)
            return Object.assign(
              range,
              { selected: nextSelected }
            );
          } else {
            return range;
          }
        });
        setRanges(nextRanges);

      } else if (event.key === "r") {

        event.preventDefault()
        handleRandomizeRanges()

      } else if (event.keyCode === 32) {

        event.preventDefault()
        if (processingStep === 0)
          setProcessingStep(1);

      }

    }

    window.addEventListener("keydown", onKeydown)

    return () => {
      window.removeEventListener('keydown', onKeydown);
    }
  }, [selectedRange, ranges, processingStep])

  const takeScreenshot = () => {

    const process_prompt = ranges
          .filter(r => r.name === "prompt")
          .map(range => {
      return range.content[range.selected];
    }).join(", ");

    const screenshot = webcamRef.current.getScreenshot();

    const currentImage = {
      id: Date.now(),
      capture: screenshot,
      result: "processing.jpg",
      prompt: process_prompt,
      isProcessing: true,
    }
    setImages([
      currentImage,
      ...images
    ]);
    setProcessingStep(2);
  }

  const apiProcessing = () => {
    const currentImage = images[0];

    let formData = new FormData();
    formData.append('prompt', currentImage.prompt);
    formData.append(
      'file',
      currentImage.capture.replace("data:image/jpeg;base64,", "")
    );

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

      const nextImages = images.map((image, i) => {
        if (i === 0) {
          const resultObj = URL.createObjectURL(result);
          return Object.assign(
            currentImage,
            {
              isProcessing: false,
              result: resultObj
            }
          )
        } else {
          return image;
        }
      });
      setImages(nextImages)

    })
    .catch(error => {
      console.error('Error:', error);

      const nextImages = images.map((image, i) => {
        if (i === 0) {
          return Object.assign(
            currentImage,
            {
              isProcessing: false,
              result: "erorr.jpg",
              error: error.toString()
            }
          )
        } else {
          return image;
        }
      });
      setImages(nextImages)
    })
    .finally(() => {
      setProcessingStep(0);
    })
  }

  useEffect(() => {

    if(processingStep === 0) return;

    if (processingStep === 1) {
      takeScreenshot();
    } else if (processingStep === 2) {
      apiProcessing();
    }

  }, [processingStep])

  const handleProcessClick = () => {
    setProcessingStep(1);
  }

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
                              handleRangeChange(event, rangeIndex)
                            }
                            onClick={() => setSelectedRange(rangeIndex)}
                          />
                          <Form.Label>
                            { range.content[range.selected] }
                          </Form.Label>
                        </div>
                      ))}
                      <Button
                        onClick={handleRandomizeRanges}
                        variant="secondary"
                        className="me-2"
                      >
                        Randomize
                      </Button>
                      <Button
                        onClick={handleProcessClick}
                        variant="primary"
                        disabled={processingStep !== 0}
                      >
                      { processingStep !== 0 ?
                        "Processing..."
                        :
                        "Capture"
                      }
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
                <Col sm="9">
                  <Row xs={1} md={3} className="g-4">
                  { images.map((image, index) => (
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
