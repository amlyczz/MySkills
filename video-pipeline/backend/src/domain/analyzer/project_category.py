from enum import Enum

class ProjectCategory(str, Enum):
    """Routing category for QA dimension selection.

    Determines which QA scoring dimensions apply and which scene templates
    are preferred during blueprint composition.
    """

    EDUCATIONAL = "educational"
    PROMO = "promo"
    TECH_DEEP_DIVE = "tech_deep_dive"
    PRODUCT_SHOWCASE = "product_showcase"
    TRENDING_DIGEST = "trending_digest"
