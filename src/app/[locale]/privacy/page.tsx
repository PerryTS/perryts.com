import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Datenschutzerklärung von Skelpo GmbH",
};

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen">
      <Header />

      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3">
            <span className="gradient-text">Datenschutzerklärung</span>
          </h1>
          <p className="text-slate-400 mb-12">
            Letzte Aktualisierung: November 2025
          </p>

          <div className="space-y-10 text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                1. Einleitung
              </h2>
              <p>
                Skelpo GmbH (&quot;wir&quot;, &quot;uns&quot; oder
                &quot;unser&quot;) respektiert deine Privatsphäre und
                verpflichtet sich, deine personenbezogenen Daten zu schützen.
                Diese Datenschutzerklärung erklärt, wie wir deine Daten sammeln,
                verwenden und schützen.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                2. Daten, die wir sammeln
              </h2>
              <p className="mb-3">
                Wir können folgende Arten von personenbezogenen Daten sammeln:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  Kontaktinformationen (Name, E-Mail-Adresse, Telefonnummer)
                </li>
                <li>Projektinformationen, die du uns zur Verfügung stellst</li>
                <li>Technische Daten (IP-Adresse, Browser-Typ, Geräteinformationen)</li>
                <li>Nutzungsdaten (wie du unsere Website verwendest)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                3. Wie wir deine Daten verwenden
              </h2>
              <p className="mb-3">Wir verwenden deine Daten für folgende Zwecke:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Bereitstellung unserer Dienstleistungen</li>
                <li>Kommunikation mit dir über Projekte und Anfragen</li>
                <li>Verbesserung unserer Website und Dienstleistungen</li>
                <li>Einhaltung rechtlicher Verpflichtungen</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">4. Cookies</h2>
              <p>
                Unsere Website verwendet Cookies, um die Benutzererfahrung zu
                verbessern. Du kannst Cookies in deinen Browsereinstellungen
                deaktivieren, dies kann jedoch die Funktionalität der Website
                beeinträchtigen.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                5. Deine Rechte
              </h2>
              <p className="mb-3">Unter der DSGVO hast du folgende Rechte:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Recht auf Auskunft über deine gespeicherten Daten</li>
                <li>Recht auf Berichtigung unrichtiger Daten</li>
                <li>Recht auf Löschung Ihrer Daten</li>
                <li>Recht auf Einschränkung der Verarbeitung</li>
                <li>Recht auf Datenübertragbarkeit</li>
                <li>Widerspruchsrecht gegen die Verarbeitung</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                6. Datensicherheit
              </h2>
              <p>
                Wir setzen angemessene technische und organisatorische Maßnahmen
                ein, um deine personenbezogenen Daten vor unbefugtem Zugriff,
                Verlust oder Zerstörung zu schützen.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">7. Kontakt</h2>
              <p>
                Wenn du Fragen zu dieser Datenschutzerklärung hast oder deine
                Rechte ausüben möchtest, kontaktiere uns bitte unter:
                <br />
                Email:{" "}
                <a
                  href="mailto:info@skelpo.com"
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  info@skelpo.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
