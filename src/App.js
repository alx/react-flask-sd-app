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
  {
    name: "slide1",
    selected: 0,
    content: [
      "all nude under the shower",
      "disco night, 70s movie, disco costume, alice in wonderland",
      "zombie night, detailled face maquillage"
    ]
  },
  {
    name: "slide2",
    selected: 0,
    content: [
      "sunset ambiance",
      "early morning in a forrest, the sun shines on the trees",
      "by night in the harbor, lots of boat lights in the background",
      "a hot day in the atacama desert, by an oasis"
    ]
  },
  {
    name: "slide3",
    selected: 0,
    content: [
      "photorealism, crisp photo from latest gen iphone",
      "illusionism style, framed in a museum",
      "colorful miro style, masterpiece",
      "in a preschool kid drawing style"
    ]
  }
]

function App() {

  const webcamRef = useRef(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState(initImages);
  const [prompts, setPrompts] = useState(initialPrompts);
  const [selectedRange, setSelectedRange] = useState(0);

  const handlePromptChange = (event, index) => {
    const nextPrompts = prompts.map((prompt, i) => {
      if (i === index) {
        return {
          name: prompt.name,
          selected: parseInt(event.target.value),
          content: prompt.content
        }
      } else {
        return prompt;
      }
    });

    setPrompts(nextPrompts);
  }

  useEffect(() => {

    const onKeydown = (event) => {

      if (event.key === "ArrowUp") {

        event.preventDefault()
        setSelectedRange(selectedRange === 0 ?
                        0 : (selectedRange - 1))

      } else if (event.key === "ArrowDown") {

        event.preventDefault()
        setSelectedRange(selectedRange === (prompts.length - 1) ?
                        selectedRange : (selectedRange + 1))

      } else if (event.key === "ArrowLeft") {

        const nextPrompts = prompts.map((prompt, i) => {
          if (i === selectedRange) {
            const nextSelected = prompt.selected === 0 ?
                  0 : (prompt.selected - 1)
            return {
              name: prompt.name,
              selected: nextSelected,
              content: prompt.content
            }
          } else {
            return prompt;
          }
        });
        setPrompts(nextPrompts);

      } else if (event.key === "ArrowRight") {

        const nextPrompts = prompts.map((prompt, i) => {
          if (i === selectedRange) {
            const nextSelected = prompt.selected === (prompt.content.length - 1) ?
                  prompt.selected : (prompt.selected + 1)
            return {
              name: prompt.name,
              selected: nextSelected,
              content: prompt.content
            }
          } else {
            return prompt;
          }
        });
        setPrompts(nextPrompts);

      } else if (event.keyCode === 32) {

        if (!isProcessing)
          handleProcessClick();

      }

    }

    window.addEventListener("keydown", onKeydown)

    return () => {
      window.removeEventListener('keydown', onKeydown);
    }
  }, [selectedRange, prompts])

  const handleProcessClick = () => {

    setIsProcessing(true);

    const process_prompt = prompts.map(prompt => {
      return prompt.content[prompt.selected];
    }).join(", ");

    const screenshot = webcamRef.current.getScreenshot();

    setImages([
        {
          capture: screenshot,
          processed: "processing.jpg",
          prompt: process_prompt,
          isProcessing: true,
        },
      ...images
    ]);

    // Process image
    let formData = new FormData();
    formData.append('prompt', prompt);
    formData.append(
      'file',
      screenshot.replace("data:image/jpeg;base64,", "")
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

        const processed = URL.createObjectURL(result);
        setImages(
          images.filter((image, i) => i !== 0)
        );
        setImages([
            {
              capture: screenshot,
              processed: processed,
              prompt: process_prompt
            },
          ...images
        ]);

      })
      .catch(error => {
        console.error('Error:', error);
        setImages(
          images.filter((image, i) => i !== 0)
        );
        setImages([
            {
              capture: screenshot,
              processed: "error.jpg",
              prompt: process_prompt,
              error: error.toString()
            },
          ...images
        ])
      })
      .finally(() => {
        setIsProcessing(false);
      })

    ;
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
                      { prompts.map((prompt, promptIndex) => (
                        <div key={prompt.name}>
                          <Form.Range
                            min={0}
                            value={prompt.selected}
                            max={prompt.content.length - 1}
                            step={1}
                            disabled={selectedRange !== promptIndex}
                            onChange={(event) =>
                              handlePromptChange(event, promptIndex)
                            }
                            onClick={() => setSelectedRange(promptIndex)}
                          />
                          <Form.Label>{ prompt.content[prompt.selected] }</Form.Label>
                        </div>
                      ))}
                      <Button
                        onClick={handleProcessClick}
                        variant="primary"
                        disabled={isProcessing}
                      >
                        Capture
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
                <Col sm="9">
                  <Row xs={1} md={3} className="g-4">
                  { images.map((image, index) => (
                    <Col key={index}>
                      <Card style={{ width: '18rem' }}>
                        <Card.Img variant="top" src={image.capture} />
                        <Card.Img variant="top" src={image.processed} />
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
