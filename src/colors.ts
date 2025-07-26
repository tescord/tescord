import kleur from 'kleur';
import colorSupport from 'color-support';
kleur.enabled = (colorSupport({ alwaysReturn: true, level: 3 }) as Exclude<ReturnType<typeof colorSupport>, false>).level > 0;
