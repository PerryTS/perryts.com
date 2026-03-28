export function PlatformSupport() {
  const platforms = [
    {
      name: "macOS",
      framework: "AppKit",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      ),
      status: "Stable",
      statusColor: "text-green-400",
    },
    {
      name: "iOS",
      framework: "UIKit",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 1h-8C6.12 1 5 2.12 5 3.5v17C5 21.88 6.12 23 7.5 23h8c1.38 0 2.5-1.12 2.5-2.5v-17C18 2.12 16.88 1 15.5 1zm-4 21c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5-4H7V4h9v14z" />
        </svg>
      ),
      status: "Stable",
      statusColor: "text-green-400",
    },
    {
      name: "iPadOS",
      framework: "UIKit",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 1H5c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-7 20c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm7-3H5V4h14v14z" />
        </svg>
      ),
      status: "Stable",
      statusColor: "text-green-400",
    },
    {
      name: "Android",
      framework: "Views",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V7H6v11zM3.5 7C2.67 7 2 7.67 2 8.5v7c0 .83.67 1.5 1.5 1.5S5 16.33 5 15.5v-7C5 7.67 4.33 7 3.5 7zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
        </svg>
      ),
      status: "Stable",
      statusColor: "text-green-400",
    },
    {
      name: "Linux",
      framework: "GTK4",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      ),
      status: "Stable",
      statusColor: "text-green-400",
    },
    {
      name: "Windows",
      framework: "Win32",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 12V6.5l6-1V12H3zm7-6.74L21 3v9h-11V5.26zM3 13h6v6.5l-6-1V13zm7 .26V21l11-2v-5.74H10z" />
        </svg>
      ),
      status: "Stable",
      statusColor: "text-green-400",
    },
    {
      name: "watchOS",
      framework: "SwiftUI",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
        </svg>
      ),
      status: "Stable",
      statusColor: "text-green-400",
    },
    {
      name: "tvOS",
      framework: "SwiftUI",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7l-2 3v1h8v-1l-2-3h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z" />
        </svg>
      ),
      status: "Stable",
      statusColor: "text-green-400",
    },
    {
      name: "WASM",
      framework: "WebAssembly",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2 12l2-2 2 2-2 2-2-2zm4-4l2-2 2 2-2 2-2-2zm0 8l2-2 2 2-2 2-2-2zm4-4l2-2 2 2-2 2-2-2zm4-4l2-2 2 2-2 2-2-2zm0 8l2-2 2 2-2 2-2-2zm4-4l2-2 2 2-2 2-2-2z" />
        </svg>
      ),
      status: "Stable",
      statusColor: "text-green-400",
    },
    {
      name: "Web",
      framework: "JavaScript",
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3h18v18H3V3zm16.525 13.707c-.131-.821-.666-1.511-2.252-2.155-.552-.259-1.165-.438-1.349-.854-.068-.248-.078-.382-.034-.529.113-.484.687-.629 1.137-.495.293.086.567.317.733.646.775-.507.775-.507 1.316-.844-.2-.308-.303-.446-.438-.576-.609-.646-1.429-.826-2.295-.655a2.557 2.557 0 00-.664.291c-.384.256-.745.652-.879 1.091-.261.81-.108 1.98.488 2.526.593.502 1.463.8 1.975 1.107.357.217.612.553.549.953-.092.573-.663.739-1.197.671-.551-.093-.855-.365-1.186-.829l-1.313.78c.135.304.285.432.512.713.932.93 3.257 1.066 3.672-.433.015-.055.137-.516.056-.95zm-7.93-2.234l1.583 3.705.008.018h1.227l1.893-4.626h-1.332l-1.14 3.159-1.101-3.159H9.993l-1.136 3.159-1.109-3.159H6.375L8.27 15.48h1.218l.088-.225 1.019-2.782z" />
        </svg>
      ),
      status: "Stable",
      statusColor: "text-green-400",
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Native on <span className="gradient-text">Every Platform</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Perry compiles your TypeScript to native UI frameworks, WebAssembly, and JavaScript — not web views, not Electron.
            Real native widgets on every platform, plus the web.
          </p>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-4">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="feature-card text-center flex flex-col items-center gap-3"
            >
              <div className="text-perry-400">{platform.icon}</div>
              <div>
                <h3 className="font-semibold text-white">{platform.name}</h3>
                <p className="text-sm text-slate-500">{platform.framework}</p>
              </div>
              <span className={`text-xs font-medium ${platform.statusColor}`}>
                {platform.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
