import { FindAllQueryDto } from '../../../common/dto/find-all-query.dto';

/**
 * Query shape for listing announcements. Inherits the canonical
 * `{ limit, offset, search, order }` contract; no extra filters today.
 */
export class ListAnnouncementsQueryDto extends FindAllQueryDto {}
