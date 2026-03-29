import { Link } from "@/i18n/navigation";

export default function Content() {
  return (
    <>
      <p>
        Hace una semana, Perry era un compilador con un toolkit de UI. Podías escribir TypeScript, compilarlo a un binario nativo y distribuirlo en seis plataformas. Esa era la historia. Hoy la historia es más grande: Perry se está convirtiendo en un ecosistema. Tres ORMs de base de datos, notificaciones push universales, compilaciones distribuidas con publicación en App Store y Play Store, una capa de compatibilidad React y verificación automatizada de apps — todo aterrizó en la última semana.
      </p>
      <p>
        Este artículo cubre lo que se lanzó, por qué importa y cómo se ve el código.
      </p>

      <h2>perry/ui: La base</h2>
      <p>
        Antes de entrar en las nuevas bibliotecas, vale la pena enfatizar lo que está en el centro de todo: <code className="text-amber-400">perry/ui</code>. Este es el toolkit de UI nativo propio de Perry — más de 20 widgets que compilan directamente a componentes nativos de plataforma en los seis objetivos. No es un wrapper, no es una capa de abstracción, no es una vista web. Cada <code className="text-amber-400">Button</code> se convierte en un <code className="text-amber-400">NSButton</code> en macOS, un <code className="text-amber-400">UIButton</code> en iOS, un <code className="text-amber-400">GtkButton</code> en Linux, un <code className="text-amber-400">android.widget.Button</code> en Android y un control <code className="text-amber-400">CreateWindowEx</code> en Windows.
      </p>
      <p>
        <code className="text-amber-400">perry/ui</code> es la superficie de UI primaria y más avanzada de Perry. Incluye gestión de estado reactiva, contenedores de layout (VStack, HStack, ZStack, SplitView), un Canvas acelerado por hardware, Table views con ordenación de columnas, el módulo <code className="text-amber-400">perry/system</code> para diálogos de archivo, acceso al llavero, notificaciones y multi-ventana — todo desde TypeScript, todo compilado a llamadas directas a la API de la plataforma. Cada otro enfoque de UI en Perry, incluyendo la capa de compatibilidad React, está construido sobre <code className="text-amber-400">perry/ui</code> y se mapea de vuelta a sus widgets.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">app.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ Window, VStack, Button, Text, State }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry/ui&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> count = <span className="text-blue-400">new</span> <span className="text-amber-400">State</span>(0);</p>
          <p className="mt-3"><span className="text-blue-400">const</span> window = <span className="text-blue-400">new</span> <span className="text-amber-400">Window</span>({`{ title: "Counter" }`});</p>
          <p>window.<span className="text-amber-400">setContent</span>(</p>
          <p className="ml-4"><span className="text-blue-400">new</span> <span className="text-amber-400">VStack</span>({`{`} children: [</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Text</span>({`{ text: count }`}),</p>
          <p className="ml-8"><span className="text-blue-400">new</span> <span className="text-amber-400">Button</span>({`{ title: "+1", onClick: () => count.set(count.get() + 1) }`}),</p>
          <p className="ml-4">] {`})`}</p>
          <p>);</p>
        </div>
      </div>

      <p>
        El objeto reactivo <code className="text-amber-400">State</code> es la primitiva clave. Cuando un valor de State cambia, solo se actualizan los widgets vinculados a ese estado — sin diffing de DOM virtual, sin re-renderizados de todo el árbol, sin pase de reconciliación. Es el camino más directo de TypeScript a UI nativa de plataforma que existe.
      </p>

      <h2>Compatibilidad React: Una capa delgada sobre perry/ui</h2>
      <p>
        Para desarrolladores que vienen de React, <code className="text-amber-400">perry-react</code> proporciona una capa de compatibilidad que mapea el modelo de componentes de React a widgets de <code className="text-amber-400">perry/ui</code>. Puedes usar <code className="text-amber-400">useState</code>, <code className="text-amber-400">useRef</code>, <code className="text-amber-400">useReducer</code> y JSX — y Perry lo compila a los mismos widgets nativos debajo. Es un puente de conveniencia, no un motor de renderizado separado.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">counter.tsx</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> React, {`{ useState }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;react&apos;</span>;</p>
          <p className="mt-3"><span className="text-violet-400">function</span> <span className="text-amber-400">Counter</span>() {`{`}</p>
          <p className="ml-4"><span className="text-blue-400">const</span> [count, setCount] = <span className="text-amber-400">useState</span>(0);</p>
          <p className="ml-4"><span className="text-violet-400">return</span> (</p>
          <p className="ml-8">&lt;<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">h1</span>&gt;{`{count}`}&lt;/<span className="text-blue-400">h1</span>&gt;</p>
          <p className="ml-12">&lt;<span className="text-blue-400">button</span> <span className="text-amber-400">onClick</span>={`{() => setCount(count + 1)}`}&gt;+1&lt;/<span className="text-blue-400">button</span>&gt;</p>
          <p className="ml-8">&lt;/<span className="text-blue-400">div</span>&gt;</p>
          <p className="ml-4">);</p>
          <p>{`}`}</p>
        </div>
      </div>

      <p>
        Bajo el capó, cada elemento JSX se mapea a un widget de <code className="text-amber-400">perry/ui</code>: <code className="text-amber-400">{`<div>`}</code> se convierte en un VStack, <code className="text-amber-400">{`<button>`}</code> se convierte en un Button, <code className="text-amber-400">useState</code> está respaldado por el State reactivo de Perry. Es temprano — Fase 1 con re-renderizados de todo el árbol y almacenamiento de hooks global — pero demuestra que código React existente puede apuntar a plataformas nativas a través de Perry. También estamos explorando compatibilidad con Angular e Ionic siguiendo líneas similares.
      </p>

      <h2>Tres ORMs de base de datos: API Prisma, rendimiento nativo</h2>
      <p>
        Si estás construyendo un servidor o una app de escritorio que habla con una base de datos, Perry ahora te cubre con tres ORMs compatibles con Prisma: <code className="text-amber-400">perry-prisma</code> (MySQL), <code className="text-amber-400">perry-sqlite</code> (SQLite) y <code className="text-amber-400">perry-postgres</code> (PostgreSQL). Los tres son reemplazos directos de <code className="text-amber-400">@prisma/client</code>. Misma API, mismos patrones de consulta, pero compilados a código nativo con FFI directo a la base de datos — sin engine de Prisma, sin Node.js.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">database.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ PrismaClient }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;@prisma/client&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> prisma = <span className="text-blue-400">new</span> <span className="text-amber-400">PrismaClient</span>();</p>
          <p className="mt-3"><span className="text-slate-500">// Misma API Prisma — compilada a SQL nativo vía Rust FFI</span></p>
          <p><span className="text-blue-400">const</span> users = <span className="text-violet-400">await</span> prisma.user.<span className="text-amber-400">findMany</span>({`{`}</p>
          <p className="ml-4">where: {`{ email: { contains: "@perry.dev" } }`},</p>
          <p className="ml-4">orderBy: {`{ createdAt: "desc" }`},</p>
          <p className="ml-4">take: 10,</p>
          <p>{`});`}</p>
          <p className="mt-3"><span className="text-violet-400">await</span> prisma.post.<span className="text-amber-400">create</span>({`{`}</p>
          <p className="ml-4">data: {`{ title: "Hello", authorId: users[0].id }`},</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        Bajo el capó, cada ORM es un frontend TypeScript respaldado por una capa FFI de Rust usando <code className="text-amber-400">sqlx</code>. El flujo de consultas: TypeScript serializa la consulta a JSON, la pasa a través de la frontera FFI, Rust construye SQL parametrizado, lo ejecuta vía el pool de conexiones y serializa el resultado de vuelta. El esquema Prisma se lee en tiempo de compilación — cero parsing en tiempo de ejecución.
      </p>
      <p>
        Las tres implementaciones comparten ~95 % de su código. Las diferencias son lo que esperarías: entrecomillado de identificadores (<code className="text-amber-400">`col`</code> vs <code className="text-amber-400">&quot;col&quot;</code>), sintaxis de placeholders (<code className="text-amber-400">?</code> vs <code className="text-amber-400">$1, $2</code>) y semántica de transacciones. Las tres soportan toda la superficie CRUD de Prisma: findMany, findFirst, findUnique, create, createMany, update, updateMany, upsert, delete, deleteMany, count — más SQL crudo, transacciones y más de 10 operadores de filtro WHERE.
      </p>

      <h2>perry-push: Notificaciones push universales</h2>
      <p>
        <code className="text-amber-400">perry-push</code> es una única biblioteca que maneja notificaciones push en todas las plataformas: APNs (iOS/macOS), FCM (Android), Web Push (navegadores) y WNS (Windows). Cada proveedor es un módulo FFI de Rust con exactamente tres funciones: <code className="text-amber-400">*_provider_new</code>, <code className="text-amber-400">*_provider_close</code> y <code className="text-amber-400">*_send</code>.
      </p>

      <div className="code-block my-8">
        <div className="flex items-center gap-2 mb-4 text-slate-500">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="ml-2 text-xs">notify.ts</span>
        </div>
        <div className="space-y-1 text-sm">
          <p><span className="text-violet-400">import</span> {`{ ApnProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/apn&apos;</span>;</p>
          <p><span className="text-violet-400">import</span> {`{ FcmProvider }`} <span className="text-violet-400">from</span> <span className="text-green-400">&apos;perry-push/fcm&apos;</span>;</p>
          <p className="mt-3"><span className="text-blue-400">const</span> apn = <span className="text-blue-400">new</span> <span className="text-amber-400">ApnProvider</span>({`{ teamId, keyId, key }`});</p>
          <p><span className="text-blue-400">const</span> fcm = <span className="text-blue-400">new</span> <span className="text-amber-400">FcmProvider</span>({`{ serviceAccount }`});</p>
          <p className="mt-3"><span className="text-slate-500">// Tipo de resultado unificado para todos los proveedores</span></p>
          <p><span className="text-blue-400">const</span> result = <span className="text-violet-400">await</span> apn.<span className="text-amber-400">send</span>({`{`}</p>
          <p className="ml-4">deviceToken: token,</p>
          <p className="ml-4">title: <span className="text-green-400">&quot;New message&quot;</span>,</p>
          <p className="ml-4">body: <span className="text-green-400">&quot;You have a new reply&quot;</span>,</p>
          <p>{`});`}</p>
        </div>
      </div>

      <p>
        La criptografía es manejada por <code className="text-amber-400">ring</code> — ES256 JWTs para APNs y VAPID, RS256 para cuentas de servicio FCM, AES-GCM para cifrado de payload Web Push. Todo compilado a código nativo. Sin <code className="text-amber-400">node-gyp</code>, sin dependencia de OpenSSL.
      </p>

      <h2>Perry Hub + Builders: Compilaciones distribuidas en la nube</h2>
      <p>
        Este es el juego de infraestructura. <code className="text-amber-400">perry-hub</code> es un servidor de orquestación de compilaciones — él mismo compilado desde TypeScript por Perry — que gestiona un pool de workers de compilación. Empujas tu proyecto, el hub lo despacha al worker correcto basándose en la plataforma objetivo, y el worker compila, firma y opcionalmente publica tu app.
      </p>
      <p>
        Hoy existen dos workers: un builder macOS (maneja objetivos macOS, iOS y Android) y un builder Linux (maneja Linux y Android). Ambos son binarios Rust que se conectan al hub vía WebSocket, descargan tarballs de código fuente, ejecutan el compilador Perry y suben artefactos de vuelta.
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Firma de código</strong> — notarización Apple para macOS, perfiles de aprovisionamiento para iOS, firma de keystore Android</li>
        <li><strong>Publicación en App Store</strong> — carga directa a App Store Connect y Google Play Store</li>
        <li><strong>Gestión de artefactos</strong> — binarios compilados subidos al hub con limpieza basada en TTL</li>
        <li><strong>Gestión de licencias</strong> — límites de tasa por licencia, encolamiento prioritario (nivel pro obtiene prioridad)</li>
      </ul>
      <p>
        El hub en sí es un caso de estudio fascinante. Es un archivo TypeScript de ~1.500 líneas compilado a un binario nativo de 2 MB por Perry. Ejecuta Fastify en el puerto 3456 para HTTP y <code className="text-amber-400">ws</code> en el puerto 3457 para WebSocket. Todo el estado está en memoria con persistencia JSON — sin base de datos externa. Es el tipo de servidor que puedes desplegar con <code className="text-amber-400">scp</code> y un archivo de unidad systemd.
      </p>

      <h2>perry-verify: Verificación automatizada de apps</h2>
      <p>
        <code className="text-amber-400">perry-verify</code> es un servicio HTTP independiente que toma un binario compilado y una configuración, ejecuta un pipeline de verificación y devuelve resultados estructurados de aprobado/fallido con capturas de pantalla. Lanza la app, ejecuta flujos de autenticación (determinísticos o asistidos por IA), verifica el estado y captura evidencia.
      </p>
      <p>
        Existen adaptadores de plataforma para macOS (vía APIs de accesibilidad), Linux (AT-SPI) y stubs para iOS Simulator y Android Emulator. La capa de IA usa Claude para autenticación de respaldo y verificación de estado cuando los chequeos determinísticos no son posibles. Está diseñado para insertarse en el pipeline de compilación del hub como paso post-compilación: compilar, firmar, verificar, publicar.
      </p>

      <h2>Pry está en todas partes</h2>
      <p>
        <Link href="/blog/building-pry" className="text-amber-400 hover:text-amber-300">Pry</Link>, el visor JSON nativo que construimos como showcase de Perry, ahora está en cinco plataformas. Está en el{" "}
        <a href="https://apps.apple.com/app/pry-json-viewer/id6759329040" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Mac App Store</a> y{" "}
        <a href="https://play.google.com/store/apps/details?id=com.perry.pry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">Google Play</a>, con binarios nativos para Linux y Windows. La misma base de código TypeScript, cinco puntos de entrada específicos de plataforma, cinco binarios nativos. Es la prueba más concreta de que todo este enfoque funciona de principio a fin — desde el código fuente TypeScript hasta la ficha del App Store.
      </p>

      <h2>Qué significa todo esto</h2>
      <p>
        Un compilador es interesante. Un ecosistema es útil. En la última semana, Perry pasó de &quot;puedes compilar TypeScript a nativo&quot; a &quot;puedes construir una app completa con UI nativa, una base de datos Prisma, notificaciones push y compilaciones que auto-publican en el App Store.&quot;
      </p>
      <p>
        Las piezas están empezando a conectarse:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>perry/ui</strong> es el camino más directo de TypeScript a UI nativa de plataforma — estado reactivo, más de 20 widgets, cero capas de abstracción</li>
        <li><strong>perry-prisma/sqlite/postgres</strong> significa que el código de base de datos existente se porta con cambios mínimos</li>
        <li><strong>perry-push</strong> significa notificaciones push nativas sin bibliotecas por plataforma</li>
        <li><strong>perry-hub + builders</strong> significa que puedes ir de <code className="text-amber-400">perry publish</code> al App Store en un paso</li>
        <li><strong>perry-verify</strong> significa pruebas automatizadas de la salida compilada, no solo del código fuente</li>
        <li><strong>perry-react</strong> significa que los desarrolladores React pueden comenzar con Perry usando patrones familiares, todo mapeado a perry/ui debajo</li>
      </ul>
      <p>
        Esto no es teórico. Cada biblioteca listada aquí tiene código funcional, tests y documentación. Varias ya se usan en producción — el propio sitio de Perry corre sobre un servidor Fastify compilado por Perry, y Pry está activo en dos tiendas de apps.
      </p>

      <h2>Qué viene después</h2>
      <p>
        La hoja de ruta inmediata:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Expansión de perry/ui</strong> — arrastrar y soltar, etiquetas de accesibilidad, menús contextuales personalizados, más primitivas de layout</li>
        <li><strong>Integración de perry-verify</strong> — verificación automatizada en el pipeline de compilación</li>
        <li><strong>Compatibilidad de frameworks</strong> — mejorando las capas React, Angular e Ionic como rampas de acceso a perry/ui</li>
        <li><strong>Soporte completo de regex</strong> — motor regex compatible con ECMAScript compilado a nativo</li>
      </ul>
      <p>
        Sigue el progreso en{" "}
        <a href="https://github.com/PerryTS/perry" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">GitHub</a>, o consulta la{" "}
        <Link href="/roadmap" className="text-amber-400 hover:text-amber-300">hoja de ruta</Link>
        {" "}para el panorama completo.
      </p>
    </>
  );
}
