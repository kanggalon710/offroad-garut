import { ChevronDown } from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/shared/container";
import { faqs } from "@/lib/faq";
import { site } from "@/lib/site";

export function Faq() {
  return (
    <Section id="tanya-jawab">
      <Container>
        <SectionHeading
          eyebrow="Tanya jawab"
          title="Yang paling sering ditanyakan sebelum pesan"
          description="Kalau pertanyaanmu belum terjawab di sini, chat saja langsung. Nomor di bawah dipegang orang, bukan bot."
        />

        <div className="mt-10 max-w-3xl divide-y divide-border border-y border-border">
          {faqs.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-semibold [&::-webkit-details-marker]:hidden">
                <span>{faq.question}</span>
                <ChevronDown
                  className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-5 pr-9 text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>

        <p className="mt-8 text-meta text-muted-foreground">
          Masih ragu? Chat{" "}
          <a
            href={`https://wa.me/${site.whatsapp.replace("+", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            {site.whatsappDisplay}
          </a>
          , dijawab di jam operasional.
        </p>
      </Container>
    </Section>
  );
}
