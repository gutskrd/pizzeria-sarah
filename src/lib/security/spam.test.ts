import { describe, expect, it } from 'vitest';
import { messageFingerprintSource, scoreMessage } from './spam';

const base = { name: 'Fatima de Vries', email: 'fatima@gmail.com', secondsToSubmit: 40 };

describe('scoreMessage', () => {
  it('lets normal customer messages through', () => {
    const real = [
      { subject: 'Reservering zaterdag', message: 'Hallo, kunnen we zaterdag om 18:00 met 6 personen komen eten? Groetjes!' },
      { subject: 'Allergie', message: 'Zit er noten in de pizza van het huis? Mijn zoon is allergisch.' },
      { subject: 'Compliment', message: 'Gisteren een shoarma schotel gehaald, heerlijk! Tot de volgende keer.' },
      { subject: 'Question', message: 'Hi, do you have vegetarian options and are you open on Monday? Thanks.' },
      { subject: 'Openingstijden', message: 'Zijn jullie op tweede kerstdag open? Zie ook jullie site pizzaria-sarah.nl' },
      { subject: 'Feestje', message: 'Wij willen voor een verjaardag 10 pizza’s bestellen voor vrijdag 17:30. Kan dat?' },
    ];
    for (const m of real) {
      const v = scoreMessage({ ...base, ...m });
      expect(v.isSpam, `${m.subject}: ${v.reasons.join(', ')}`).toBe(false);
    }
  });

  it('flags sales spam with links', () => {
    const v = scoreMessage({
      ...base,
      name: 'Mike',
      email: 'mike@seo-agency.com',
      subject: 'Get your website on the first page of Google',
      message: 'Hi, we offer SEO and link building. Check https://cheap-seo.xyz and www.backlinks.top, or click here: https://x.co/a',
    });
    expect(v.isSpam).toBe(true);
    expect(v.reasons.join(' ')).toMatch(/links/);
  });

  it('flags HTML link code, odd names and throwaway addresses', () => {
    expect(scoreMessage({ ...base, subject: 'Hoi', message: 'Leuk <a href="https://spam.ru">hier</a> kijken' }).isSpam).toBe(true);
    expect(scoreMessage({ ...base, name: 'https://win.example.com', email: 'x@yopmail.com', subject: 'Hoi', message: 'Hallo daar, groetjes!' }).isSpam).toBe(
      true,
    );
  });

  it('flags text in an unusual script combined with links', () => {
    const v = scoreMessage({ ...base, subject: 'Привет', message: 'Привет! Лучшие предложения для вашего бизнеса здесь: http://promo.ru' });
    expect(v.isSpam).toBe(true);
  });

  it('does not match spam words inside normal words', () => {
    const v = scoreMessage({ ...base, subject: 'Museo', message: 'We gaan na het museo bij jullie eten, en daarna naar de volwassenen-avond.' });
    expect(v.reasons.join(' ')).not.toMatch(/spamwoorden/);
  });
});

describe('messageFingerprintSource', () => {
  it('treats the same text from the same sender as a duplicate', () => {
    expect(messageFingerprintSource('A@B.nl', 'Hallo  daar\n')).toBe(messageFingerprintSource('a@b.nl', 'hallo daar'));
    expect(messageFingerprintSource('a@b.nl', 'Hallo')).not.toBe(messageFingerprintSource('c@b.nl', 'Hallo'));
  });
});
