import { useEffect, useRef, useState } from 'react';

function pararCamera(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

function criarArquivoDaFoto(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Nao foi possivel capturar a foto.'));
        return;
      }

      resolve(new File([blob], `nota-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  });
}

export function CameraNotaScanner({ aberto, onFechar, onCapturar, processando = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraPronta, setCameraPronta] = useState(false);
  const [erroCamera, setErroCamera] = useState('');

  useEffect(() => {
    if (!aberto) return undefined;

    let ativo = true;

    async function iniciarCamera() {
      setCameraPronta(false);
      setErroCamera('');

      if (!navigator.mediaDevices?.getUserMedia) {
        setErroCamera('Camera nao disponivel neste navegador.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        if (!ativo) {
          pararCamera(stream);
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraPronta(true);
        }
      } catch (erro) {
        console.error('Erro ao abrir camera:', erro);
        setErroCamera('Nao foi possivel abrir a camera. Verifique a permissao do navegador.');
      }
    }

    iniciarCamera();

    return () => {
      ativo = false;
      pararCamera(streamRef.current);
      streamRef.current = null;
      setCameraPronta(false);
    };
  }, [aberto]);

  if (!aberto) return null;

  const handleFechar = () => {
    if (processando) return;
    onFechar();
  };

  const handleCapturar = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !cameraPronta || processando) return;

    const largura = video.videoWidth || 1280;
    const altura = video.videoHeight || 720;
    const contexto = canvas.getContext('2d', { alpha: false });

    canvas.width = largura;
    canvas.height = altura;
    contexto.drawImage(video, 0, 0, largura, altura);

    const arquivo = await criarArquivoDaFoto(canvas);
    onFechar();
    await onCapturar(arquivo);
  };

  return (
    <div className="camera-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="camera-title">
      <div className="camera-modal">
        <div className="camera-modal-header">
          <h3 id="camera-title">Camera da nota</h3>
          <button type="button" className="secondary-button compact-button" onClick={handleFechar} disabled={processando}>
            Fechar
          </button>
        </div>

        <div className="camera-frame">
          {erroCamera ? (
            <p className="form-error">{erroCamera}</p>
          ) : (
            <>
              <video ref={videoRef} className="camera-video" playsInline muted />
              <div className="camera-scan-outline" aria-hidden="true" />
            </>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden-canvas" />

        <div className="camera-actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleCapturar}
            disabled={!cameraPronta || processando || Boolean(erroCamera)}
          >
            Capturar nota
          </button>
        </div>
      </div>
    </div>
  );
}
