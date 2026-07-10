// Utility to dynamically load TensorFlow.js and the Magenta style transfer models.

const TFJS_CDN = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';

const PREDICTOR_URL = 'https://storage.googleapis.com/tfjs-models/savedmodel/style_transfer_predictor/model.json';
const TRANSFORMER_URL = 'https://storage.googleapis.com/tfjs-models/savedmodel/style_transfer_transformer/model.json';

export class ModelLoader {
  private static tfLoaded = false;
  public static predictorModel: any = null;
  public static transformerModel: any = null;

  public static async loadTFJS(onProgress: (percent: number) => void): Promise<any> {
    if (this.tfLoaded) {
      onProgress(30);
      return (window as any).tf;
    }

    return new Promise((resolve, reject) => {
      onProgress(10);
      const script = document.createElement('script');
      script.src = TFJS_CDN;
      script.async = true;
      script.onload = () => {
        this.tfLoaded = true;
        onProgress(30);
        resolve((window as any).tf);
      };
      script.onerror = () => {
        reject(new Error('Failed to load TensorFlow.js from CDN.'));
      };
      document.head.appendChild(script);
    });
  }

  public static async loadModels(onProgress: (percent: number) => void): Promise<void> {
    const tf = await this.loadTFJS(onProgress);
    
    if (this.predictorModel && this.transformerModel) {
      onProgress(100);
      return;
    }

    try {
      onProgress(40);
      // Load Predictor
      this.predictorModel = await tf.loadGraphModel(PREDICTOR_URL);
      onProgress(70);
      
      // Load Transformer
      this.transformerModel = await tf.loadGraphModel(TRANSFORMER_URL);
      onProgress(100);
    } catch (err: any) {
      console.error(err);
      throw new Error('Failed to load style transfer models: ' + err.message);
    }
  }

  public static isLoaded(): boolean {
    return this.predictorModel !== null && this.transformerModel !== null;
  }
}
