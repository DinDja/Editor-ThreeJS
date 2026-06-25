'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

type FAQAccordionProps = {
  items: { question: string; answer: string }[];
};

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="divide-y divide-neutral-800/60">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={index}>
            <button
              type="button"
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-neutral-200 transition-colors hover:text-neutral-50"
            >
              <span>{item.question}</span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-neutral-500 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isOpen && (
              <div className="pb-4 text-sm leading-relaxed text-neutral-400">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
