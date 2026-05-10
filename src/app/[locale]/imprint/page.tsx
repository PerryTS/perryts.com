import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Rechtliche Informationen — Skelpo GmbH",
};

export default async function ImprintPage({
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
            <span className="gradient-text">Impressum</span>
          </h1>
          <p className="text-slate-400 mb-12">Rechtliche Informationen</p>

          <div className="space-y-10 text-slate-300 leading-relaxed">
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                Angaben gemäß § 5 TMG
              </h2>
              <p>
                <strong className="text-white">Skelpo GmbH</strong>
                <br />
                Köttingstraße 41
                <br />
                58339 Breckerfeld
                <br />
                Deutschland
                <br />
                Telefon +49 (0) 2338 8733446
                <br />
                E-Mail:{" "}
                <a
                  href="mailto:info@skelpo.com"
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  info@skelpo.com
                </a>
                <br />
                Handelsregister: Amtsgericht Hagen HRB 8266
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                Kontaktinformationen
              </h2>
              <p>
                E-Mail:{" "}
                <a
                  href="mailto:info@skelpo.com"
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  info@skelpo.com
                </a>
                <br />
                Website: www.skelpo.com
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">Vertreter</h2>
              <p>Vertretungsberechtigter Geschäftsführer: Ralph Küpper</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                Umsatzsteuer-Identifikationsnummer
              </h2>
              <p>Umsatzsteuer-Identifikationsnummer DE266573808</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                Haftungsausschluss (Disclaimer)
              </h2>

              <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                Haftung für Inhalte
              </h3>
              <p>
                Die Inhalte dieser Website werden mit größter Sorgfalt erstellt.
                Wir übernehmen jedoch keine Gewähr für die Richtigkeit,
                Vollständigkeit und Aktualität der bereitgestellten Inhalte. Als
                Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte
                auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
                Nach §§ 8 bis 10 TMG sind Diensteanbieter jedoch nicht
                verpflichtet, übermittelte oder gespeicherte fremde
                Informationen zu überwachen oder nach Umständen zu forschen, die
                auf eine rechtswidrige Tätigkeit hinweisen.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                Haftung für Links
              </h3>
              <p>
                Unsere Website enthält Links zu externen Websites. Für deren
                Inhalte tragen wir keine Haftung, da diese außerhalb unseres
                Einflussbereiches liegen. Der Anbieter der Website, auf die
                verlinkt wird, ist allein verantwortlich für seinen Inhalt.
              </p>

              <h3 className="text-xl font-semibold mb-3 mt-6 text-white">
                Urheberrecht
              </h3>
              <p>
                Die auf diesen Seiten veröffentlichten Inhalte und Werke
                unterliegen dem deutschen Urheberrecht. Vervielfältigungen,
                Bearbeitungen, Verbreitungen und jede Art der Verwertung
                außerhalb der Grenzen des Urheberrechtes bedürfen der
                schriftlichen Zustimmung des Autors oder Erstellers.
              </p>
            </section>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
