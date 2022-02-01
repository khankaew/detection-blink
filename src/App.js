import React from "react";
import Webcam from "react-webcam";
import * as tf from '@tensorflow/tfjs';
const faceLandmarksDetection = require('@tensorflow-models/face-landmarks-detection');
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      text: '',
      count: 0,
      model: null,
      // for face out frame
      maxLeft: 0,
      maxRight: 0
    };
    this.webcamRef = React.createRef();
  }

  componentDidMount() {
    tf.setBackend('webgl');
    this.loadModel()
  }

  loadModel() {
    // Load the MediaPipe Facemesh package.
    faceLandmarksDetection.load(
      faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
      { maxFaces: 1 }
    ).then(model => {
      console.log(model);
      this.setState({ model })
    }).catch(err => {
      console.log(err);
    });
  }

  handleClick() {
    console.log('handleClick');
    const { isOpen, count } = this.state
    this.setState({
      isOpen: !isOpen,
      count: isOpen ? count : 0
    }, () => {
      if (!isOpen) {
        setTimeout(() => {
          this.setState({ detecting: 'detecting...' })
          this.detectPoints()
        }, 2000);
      }
    })
  }

  async detectPoints() {
    const { model, isOpen, count } = this.state
    const video = await this.webcamRef.current.video
    // console.log(video);

    const predictions = await model.estimateFaces({
      input: video,
      returnTensors: false,
      flipHorizontal: true,
      predictIrises: true
    });

    if (predictions.length > 0) {
      // Somente 1 face
      const keypoints = predictions[0].scaledMesh;
      if (this.detectarBlink(keypoints)) {
        // TODO :: Found blink, do someting
        const countN = count + 1
        this.setState({ count: countN })

        if (!isOpen) {
          // stop detection
          this.setState({ detecting: '' })
          return null;
        }
      }
    } else {
      this.setState({
        maxLeft: 0,
        maxRight: 0
      })
    }

    setTimeout(async () => {
      await this.detectPoints();
    }, 40);
  }

  detectarBlink(keypoints) {
    // point around left eye
    const leftEye_left = 263;
    const leftEye_right = 362;
    const leftEye_top = 386;
    const leftEye_buttom = 374;
    // point around right eye
    const rightEye_left = 133;
    const rightEye_right = 33;
    const rightEye_top = 159;
    const rightEye_buttom = 145;

    const leftVertical = this.calculateDistance(keypoints[leftEye_top][0], keypoints[leftEye_top][1], keypoints[leftEye_buttom][0], keypoints[leftEye_buttom][1]);
    const leftHorizontal = this.calculateDistance(keypoints[leftEye_left][0], keypoints[leftEye_left][1], keypoints[leftEye_right][0], keypoints[leftEye_right][1]);
    const eyeLeft = leftVertical / (2 * leftHorizontal);

    const rightVertical = this.calculateDistance(keypoints[rightEye_top][0], keypoints[rightEye_top][1], keypoints[rightEye_buttom][0], keypoints[rightEye_buttom][1]);
    const rightHorizontal = this.calculateDistance(keypoints[rightEye_left][0], keypoints[rightEye_left][1], keypoints[rightEye_right][0], keypoints[rightEye_right][1]);
    const eyeRight = rightVertical / (2 * rightHorizontal);

    // TODO :: Need more efficient implmentation
    const baseCloseEye = 0.1
    const limitOpenEye = 0.14
    if (this.state.maxLeft < eyeLeft) {
      this.setState({ maxLeft: eyeLeft })
    }
    if (this.state.maxRight < eyeRight) {
      this.setState({ maxRight: eyeRight })
    }

    let result = false
    if ((this.state.maxLeft > limitOpenEye) && (this.state.maxRight > limitOpenEye)) {
      if ((eyeLeft < baseCloseEye) && (eyeRight < baseCloseEye)) {
        result = true
      }
    }
    console.log(result);

    return result
  }

  calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
  }

  render() {
    const videoConstraints = {
      width: 720,
      height: 480,
      facingMode: "user"
    };

    return <div style={{ margin: 20 }}>
      <div>
        <button type="button" onClick={() => this.handleClick()}>Start/Stop</button>

        <b> {this.state.detecting} </b>
        <b> :: Count blink = {this.state.count} </b>
      </div>

      {this.state.isOpen ?
        <Webcam
          audio={false}
          height={480}
          ref={this.webcamRef}
          screenshotFormat="image/jpeg"
          width={720}
          videoConstraints={videoConstraints}
        />
        : null
      }
    </div>
  }
}

export default App;
