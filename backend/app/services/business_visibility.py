from __future__ import annotations

import re


CHAIN_RESTAURANT_NAMES = {
    "applebee's", "arby's", "baskin-robbins", "bojangles'", "bob evans",
    "buffalo wild wings", "burger king", "captain d's", "chick-fil-a", "chili's",
    "chipotle", "cook out", "cracker barrel", "dairy queen", "domino's", "dq grill & chill",
    "dunkin'", "dunkin' donuts", "firehouse subs", "five guys", "golden corral",
    "hardee's", "huddle house", "hunt brothers pizza", "ihop", "jersey mike's subs",
    "jimmy john's", "kfc", "krystal", "little caesars", "long john silver's",
    "longhorn steakhouse", "mcalister's deli", "mcdonald's", "moe's southwest grill",
    "olive garden", "outback steakhouse", "panda express", "panera bread", "papa john's",
    "pizza hut", "popeyes", "qdoba", "red lobster", "ruby tuesday", "sonic",
    "starbucks", "steak 'n shake", "subway", "taco bell", "texas roadhouse",
    "tim hortons", "tropical smoothie cafe", "tudor's biscuit world", "waffle house",
    "wendy's", "wingstop", "zaxby's",
}


def normalized_business_name(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def imported_business_is_search_only(name: str, category: str, source_provider: str | None) -> bool:
    return (
        source_provider == "openstreetmap"
        and category == "food"
        and normalized_business_name(name) in CHAIN_RESTAURANT_NAMES
    )
