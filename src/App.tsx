import React, { useState, useRef } from 'react';
import { UploadCloud, Eye, AlertCircle, Info, RefreshCcw, Activity } from 'lucide-react';

interface AnalysisResult {
  diagnosis: string;
  confidence: number;
  details: string;
  boundingBox: number[];
}

export default function App() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<{ data: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('يرجى رفع صورة صالحة.');
      return;
    }
    setError(null);
    setResult(null);

    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = (event.target?.result as string).split(',')[1];
      setBase64Image({ data: base64String, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!base64Image) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image.data,
          mimeType: base64Image.mimeType,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'حدث خطأ أثناء تحليل الصورة');
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setImagePreview(null);
    setBase64Image(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <header className="max-w-3xl w-full flex flex-col items-center justify-center space-y-4 mb-10 text-slate-800">
        <div className="bg-blue-100 p-4 rounded-full text-blue-600">
          <Eye size={40} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-center">المحلل الطبي لصور العين</h1>
        <p className="text-slate-500 text-center text-lg leading-relaxed">
          نظام مدعوم بالذكاء الاصطناعي لاكتشاف المشاكل المحتملة في العين وتحديد موقعها بدقة.
        </p>
      </header>

      <main className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left/Right Column: Image / Upload */}
        <div className="flex flex-col space-y-4">
          <label className="text-lg font-semibold text-slate-700">صورة العين</label>
          {!imagePreview ? (
            <div
              className={`border-2 border-dashed border-slate-300 rounded-2xl bg-white p-10 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer group hover:shadow-sm`}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud size={48} className="mb-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              <p className="font-medium text-lg mb-2">اضغط هنا لرفع صورة</p>
              <p className="text-sm">يقبل صيغ الصور JPG, PNG</p>
            </div>
          ) : (
            <div className="relative border rounded-2xl overflow-hidden shadow-sm bg-black group max-h-[500px] flex items-center justify-center">
              <img
                src={imagePreview}
                alt="Eye preview"
                className="w-full h-auto max-h-[500px] object-contain block"
              />
              
              {/* Bounding Box Drawing */}
              {result && result.boundingBox && result.boundingBox.length === 4 && (
                <div
                  className="absolute border-4 border-red-500 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.5)] z-10 transition-all duration-700 pointer-events-none rounded-sm"
                  style={{
                    top: `${result.boundingBox[0] / 10}%`,
                    left: `${result.boundingBox[1] / 10}%`,
                    height: `${(result.boundingBox[2] - result.boundingBox[0]) / 10}%`,
                    width: `${(result.boundingBox[3] - result.boundingBox[1]) / 10}%`,
                  }}
                >
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-sm absolute -top-7 -right-1 rtl:right-auto rtl:-right-1 border border-red-600 whitespace-nowrap shadow-sm shadow-red-900/40 font-medium tracking-wide">المنطقة المتأثرة</span>
                </div>
              )}
            </div>
          )}
          
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          {imagePreview && !result && !loading && (
            <div className="flex gap-4">
              <button
                onClick={analyzeImage}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md shadow-blue-600/20 transition-all flex justify-center items-center gap-2"
              >
                <Activity size={20} />
                تحليل الصورة الآن
              </button>
              <button
                onClick={resetAll}
                className="bg-white border text-slate-600 hover:bg-slate-50 font-medium py-3 px-4 rounded-xl transition-all"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>

        {/* Right/Left Column: Results */}
        <div className="flex flex-col space-y-4">
          <label className="text-lg font-semibold text-slate-700">نتائج التحليل</label>

          {loading ? (
            <div className="bg-white rounded-2xl p-8 border shadow-sm flex flex-col items-center justify-center h-full min-h-[300px] text-slate-500">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-lg font-medium animate-pulse text-blue-800">جاري المعالجة بواسطة الذكاء الاصطناعي...</p>
              <p className="text-sm mt-2">قد يستغرق هذا بضع ثوانٍ</p>
            </div>
          ) : error ? (
             <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 flex flex-col items-center justify-center text-center">
              <AlertCircle size={40} className="mb-4" />
              <h3 className="font-semibold text-lg mb-2">عذراً، حدث خطأ</h3>
              <p>{error}</p>
              <button onClick={() => setError(null)} className="mt-4 bg-white border border-red-200 px-4 py-2 rounded-lg text-sm hover:bg-red-50">حسناً</button>
             </div>
          ) : result ? (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col">
              <div className={`p-6 border-b ${result.confidence > 70 ? 'bg-blue-50/50' : 'bg-yellow-50/50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-2xl font-bold text-slate-800">{result.diagnosis}</h3>
                  <div className="bg-white px-3 py-1 rounded-full border shadow-sm flex items-center gap-2">
                    <span className="text-sm text-slate-500 font-medium">الثقة</span>
                    <span className={`font-bold ${result.confidence > 80 ? 'text-green-600' : result.confidence > 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      %{result.confidence}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-6 flex-1">
                <div className="flex items-start gap-3 mb-6">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mt-1 shrink-0">
                    <Info size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">تفاصيل وملاحظات طبية</h4>
                    <p className="text-slate-600 leading-relaxed">{result.details}</p>
                  </div>
                </div>

                {!result.boundingBox || result.boundingBox.length !== 4 ? (
                  <div className="bg-slate-50 border rounded-lg p-4 text-center text-slate-500 text-sm">
                    لم يتمكن النظام من تحديد موقع المشكلة بدقة بصندوق تحديد إما لأن الصورة سليمة أو المشكلة عامة.
                  </div>
                ) : null}
              </div>

               <div className="p-4 bg-slate-50 border-t mt-auto">
                 <button
                    onClick={resetAll}
                    className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium py-3 px-6 rounded-xl transition-all shadow-sm flex justify-center items-center gap-2"
                  >
                    <RefreshCcw size={18} />
                    فحص صورة أخرى
                  </button>
               </div>
            </div>
          ) : (
            <div className="bg-slate-50/50 border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400">
               <Info size={48} className="mb-4 opacity-50" />
               <p className="text-center font-medium">ارفع صورة واضغط على تحليل<br/>لتظهر النتائج هنا</p>
            </div>
          )}
        </div>
      </main>

      {/* Note about Demo */}
      <footer className="mt-16 max-w-2xl text-center text-xs text-slate-400 leading-relaxed pb-8">
        <p>تنويه: هذا التطبيق هو نموذج تجريبي يعتمد على الذكاء الاصطناعي لإظهار القدرات التكنولوجية.</p>
        <p>لا يعتبر بديلاً عن الاستشارة الطبية الحقيقية. يرجى استشارة طبيب مختص دائمًا.</p>
      </footer>
    </div>
  );
}

