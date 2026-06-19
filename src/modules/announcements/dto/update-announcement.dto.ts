import { PartialType } from '@nestjs/swagger';
import { CreateAnnouncementDto } from './create-announcement.dto';

/**
 * All fields optional — a PATCH may update title, body, or both. Validation
 * rules (length, non-empty when present) are inherited from the create DTO.
 */
export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}
