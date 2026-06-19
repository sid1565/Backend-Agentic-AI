import { SetMetadata } from '@nestjs/common';
import { Section as SectionValue } from '../enums/admin-module.enum';

export const SECTION_KEY = 'section';
export const Section = (section: SectionValue) =>
  SetMetadata(SECTION_KEY, section);
