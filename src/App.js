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
import ProgressBar from 'react-bootstrap/ProgressBar';

let initImages = [];

const initialPrompts = [
  {
    name: "joycon1",
    selected: 0,
    content: [
      "all nude under the shower",
      "disco night, 70s movie, disco costume, alice in wonderland"
    ]
  }
]

function App() {

  const webcamRef = useRef(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState(initImages);
  const [prompts, setPrompts] = useState(initialPrompts);

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

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      const nextPrompts = prompts.map((prompt, i) => {
        if (i === 0) {
          return {
            name: prompt.name,
            selected: (prompt.selected - 1 + prompt.content.length) % prompt.content.length,
            content: prompt.content
          }
        } else {
          return prompt;
        }
      });
      setPrompts(nextPrompts);
    } else if (event.key === "ArrowRight") {
      const nextPrompts = prompts.map((prompt, i) => {
        if (i === 0) {
          return {

            name: prompt.name,
            selected: (prompt.selected + 1) % prompt.content.length,
            content: prompt.content
          }
        } else {
          return prompt;
        }
      });
      setPrompts(nextPrompts);
    } else if (event.keyCode === 32) {
      if (!isProcessing) {
        handleProcessClick();
      }
    }
  }, true);

  const [currentCount, setCount] = useState(0);

  useEffect(
    () => {
      const processedImage = images.some(i => i.isProcessing)
      if (processedImage) {

        setTimeout(() => {
          const nextImages = images.map((image, i) => {
            debugger
            if (
              typeof image.error === "undefined" &&
                image.isProcessing &&
                image.progress < 100) {
              return {
                capture: image.capture,
                processed: "processing.jpg",
                prompt: image.process_prompt,
                isProcessing: true,
                progress: image.progress + 0.5,
              }
            } else {
              return image;
            }
          });
          setImages(nextImages);
          setCount(currentCount + 1)
        }, 100)
        
      }
    },
    [currentCount]
  );

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
          progress: 10,
        },
      ...images
    ]);
    setCount(currentCount + 1)

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
                        <div key={promptIndex}>
                          <Form.Label>{ prompt.content[prompt.selected] }</Form.Label>
                          <Form.Range
                            min={0}
                            value={prompt.selected}
                            max={prompt.content.length - 1}
                            step={1}
                            onChange={(event) =>
                              handlePromptChange(event, promptIndex)
                            }
                          />
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
                              <ProgressBar animated now={image.progress} />
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
          <Link className="App-link" to="https://github.com/alx/react-flask-sd">react-flask-sd</Link>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;
