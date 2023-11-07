import React from 'react';
import { useRef, useState } from 'react';

import Webcam from 'react-webcam';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Image from 'react-bootstrap/Image';

export default function WebcamProcessor() {

  const webcamRef = useRef(null);

  const [prompt, setPrompt] = useState('disco night, 70s movie, disco costume, alice in wonderland');
  const [processImg, setProcessImg] = useState("waiting.jpg");

  const updatePrompt = (e) => {
    setPrompt(e.target.value);
  }

  function handleProcessClick() {
    let formData = new FormData();
    formData.append('imagefile', webcamRef.current.getScreenshot());
    formData.append('prompt', prompt);

    const postProcessRequestOptions = {
      method: 'POST',
      body: formData
    };

    setProcessImg("processing.jpg");
    fetch(`/api/processing`, postProcessRequestOptions)
      .then(response => response.blob())
      .then(image => setProcessImg(URL.createObjectURL(image)));
  }

  return (
    <Container>
      <Col>
        <Row>
          <input
            type='text'
            value={prompt}
            onChange={updatePrompt}
            placeholder='Please enter your prompt'
            style={{ margin: '5px', padding: '5px', width: '100%', fontSize: 17 }}
          />
        </Row>
        <Row>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={512}
            height={512}
          />
        </Row>
        <Row>
          <button onClick={handleProcessClick}>Process</button>
        </Row>
        <Row>
          <Image alt='process' src={processImg} fluid />
        </Row>
      </Col>
    </Container>
  );
}
