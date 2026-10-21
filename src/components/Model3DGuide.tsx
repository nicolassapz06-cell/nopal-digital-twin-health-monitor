import { Info, CheckCircle2, XCircle } from 'lucide-react';

/** Guía para exportar modelos 3D con texturas desde Blender */
export function Model3DExportGuide() {
  return (
    <div data-ev-id="ev_0dcca9a431" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div data-ev-id="ev_53ad116a10" className="flex items-start gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div data-ev-id="ev_9066edf96f">
          <h3 data-ev-id="ev_4312e552f3" className="font-semibold">Cómo exportar modelos 3D con texturas desde Blender</h3>
          <p data-ev-id="ev_2b85511ee8" className="mt-1 text-sm text-muted-foreground">
            Para que el modelo muestre texturas fotográficas, debes exportar correctamente desde Blender.
          </p>
        </div>
      </div>

      <div data-ev-id="ev_e3eebcd0b6" className="grid gap-4 md:grid-cols-2">
        {/* Pasos correctos */}
        <div data-ev-id="ev_39fa1b7983" className="flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50/50 p-4 dark:border-green-900 dark:bg-green-950/30">
          <h4 data-ev-id="ev_946c94da73" className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" /> Exportación correcta
          </h4>
          <ol data-ev-id="ev_600891cdc2" className="flex flex-col gap-2 text-sm text-green-800 dark:text-green-300">
            <li data-ev-id="ev_cb58045234" className="flex gap-2">
              <span data-ev-id="ev_a2df15b828" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800 dark:bg-green-800 dark:text-green-200">1</span>
              <span data-ev-id="ev_8caeafb054">En Blender: <code data-ev-id="ev_d987827275" className="rounded bg-green-200/50 px-1 dark:bg-green-800/50">File &gt; Export &gt; glTF 2.0 (.glb/.gltf)</code></span>
            </li>
            <li data-ev-id="ev_ea695bb148" className="flex gap-2">
              <span data-ev-id="ev_bcfb488256" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800 dark:bg-green-800 dark:text-green-200">2</span>
              <span data-ev-id="ev_68240679d4">Formato: <strong data-ev-id="ev_619864bb3c">glTF Binary (.glb)</strong></span>
            </li>
            <li data-ev-id="ev_259167f164" className="flex gap-2">
              <span data-ev-id="ev_6ea4837c10" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800 dark:bg-green-800 dark:text-green-200">3</span>
              <span data-ev-id="ev_87df342923">En "Include" activar: <strong data-ev-id="ev_af6be7ea19">☑ Textures</strong></span>
            </li>
            <li data-ev-id="ev_00a300e68a" className="flex gap-2">
              <span data-ev-id="ev_95c0c0f6cc" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800 dark:bg-green-800 dark:text-green-200">4</span>
              <span data-ev-id="ev_5b820588b5">En "Data" activar: <strong data-ev-id="ev_43225e9be7">☑ Materials</strong></span>
            </li>
            <li data-ev-id="ev_8b7cd81ab5" className="flex gap-2">
              <span data-ev-id="ev_70d0fa03d9" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800 dark:bg-green-800 dark:text-green-200">5</span>
              <span data-ev-id="ev_25740b43be">Usar materiales <strong data-ev-id="ev_4093d6b6d7">Principled BSDF</strong> con texturas en "Base Color"</span>
            </li>
          </ol>
        </div>

        {/* Errores comunes */}
        <div data-ev-id="ev_b85f28a283" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <h4 data-ev-id="ev_61ab4b7a32" className="flex items-center gap-2 font-medium text-red-700 dark:text-red-400">
            <XCircle className="h-4 w-4" /> Errores comunes
          </h4>
          <ul data-ev-id="ev_690d372f83" className="flex flex-col gap-2 text-sm text-red-800 dark:text-red-300">
            <li data-ev-id="ev_6efbd51a01" className="flex gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span data-ev-id="ev_d6046d3452">Exportar sin marcar "Textures" → modelo blanco</span>
            </li>
            <li data-ev-id="ev_d86fcec490" className="flex gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span data-ev-id="ev_894626da33">Usar .obj sin archivos .mtl/.png → sin texturas</span>
            </li>
            <li data-ev-id="ev_f626ca9a40" className="flex gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span data-ev-id="ev_ee98357143">Texturas con rutas absolutas → no se embeben</span>
            </li>
            <li data-ev-id="ev_a5376367cc" className="flex gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span data-ev-id="ev_8c43f1ff86">Materiales Cycles sin nodos correctos</span>
            </li>
            <li data-ev-id="ev_a69ad9c164" className="flex gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span data-ev-id="ev_8e3d7dea07">Imágenes no empaquetadas en el .blend</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Tip adicional */}
      <div data-ev-id="ev_6e12d6d2e1" className="rounded-lg bg-primary/5 p-3">
        <p data-ev-id="ev_80be304a29" className="text-sm">
          <strong data-ev-id="ev_4da990367e">Tip:</strong> Antes de exportar, en Blender ve a <code data-ev-id="ev_5ce8920953" className="rounded bg-primary/10 px-1">File &gt; External Data &gt; Pack Resources</code> 
          para asegurar que todas las texturas estén embebidas en el archivo.
        </p>
      </div>

      {/* Verificación */}
      <div data-ev-id="ev_cf6948dc7d" className="rounded-lg border border-dashed border-border p-3">
        <p data-ev-id="ev_010fc48699" className="text-sm text-muted-foreground">
          <strong data-ev-id="ev_269d54f502">Verificar:</strong> Un archivo .glb con texturas embebidas pesará varios MB. 
          Si tu archivo pesa menos de 100KB, probablemente no tiene texturas.
        </p>
      </div>
    </div>);

}