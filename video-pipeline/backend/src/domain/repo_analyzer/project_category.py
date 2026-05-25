from enum import Enum

class ProjectCategory(str, Enum):
    """Routing category for QA dimension selection.

    Determines which QA scoring dimensions apply and which scene templates
    are preferred during blueprint composition.
    """

    TECH_EDU = "tech_edu"
    PROMO = "promo"
    PRODUCT_SHOWCASE = "product_showcase"
    TRENDING_DIGEST = "trending_digest"
