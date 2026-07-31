# domains.py
# One source of truth for "which legal domain does each template belong to".
#
# This replaces the keyword heuristic that previously lived inside make_figures.py.
# That heuristic (a) collapsed the library into only three buckets, and (b) silently
# routed every synthetic template into "Corporate / other" because its keywords were
# derived from real Accord filenames. Both figures that report domain coverage
# (Figure 3, the real-corpus skew; Figure 4, before-vs-after expansion) now import
# from here, so the two cannot disagree.
#
# Assignments are explicit rather than inferred: 51 rows, each auditable against the
# template's own clause text. Listed in Appendix A of the dissertation.

DOMAIN_ORDER = [
    "Supply / goods / logistics",
    "Payment & financial",
    "Real estate & leasing",
    "Employment & HR",
    "IP & licensing",
    "Services & consulting",
    "Data protection & privacy",
    "Confidentiality & NDA",
    "Dispute, liability & risk",
    "Corporate & other",
]

# --- the 51 real Accord templates -------------------------------------------------
REAL_DOMAINS = {
    # Supply / goods / logistics (20)
    "acceptance-of-delivery": "Supply / goods / logistics",
    "bill-of-lading": "Supply / goods / logistics",
    "demandforecast": "Supply / goods / logistics",
    "fragile-goods": "Supply / goods / logistics",
    "latedeliveryandpenalty": "Supply / goods / logistics",
    "latedeliveryandpenalty-currency-conversion": "Supply / goods / logistics",
    "latedeliveryandpenalty-else": "Supply / goods / logistics",
    "latedeliveryandpenalty-optional": "Supply / goods / logistics",
    "latedeliveryandpenalty-optional-this": "Supply / goods / logistics",
    "minilatedeliveryandpenalty": "Supply / goods / logistics",
    "minilatedeliveryandpenalty-capped": "Supply / goods / logistics",
    "minilatedeliveryandpenalty-payment": "Supply / goods / logistics",
    "perishable-goods": "Supply / goods / logistics",
    "simplelatedeliveryandpenalty": "Supply / goods / logistics",
    "supply-agreement-loc": "Supply / goods / logistics",
    "supplyagreement": "Supply / goods / logistics",
    "supplyagreement-perishable-goods": "Supply / goods / logistics",
    "volumediscount": "Supply / goods / logistics",
    "volumediscountolist": "Supply / goods / logistics",
    "volumediscountulist": "Supply / goods / logistics",

    # Payment & financial (19)
    "docusign-po-failure": "Payment & financial",
    "fixed-interests": "Payment & financial",
    "fixed-interests-static": "Payment & financial",
    "full-payment-upon-demand": "Payment & financial",
    "full-payment-upon-signature": "Payment & financial",
    "installment-sale": "Payment & financial",
    "interest-rate-swap": "Payment & financial",
    "ip-payment": "Payment & financial",
    "lateinvoicewithpayment": "Payment & financial",
    "one-time-payment-tr": "Payment & financial",
    "online-payment-contract-tr": "Payment & financial",
    "payment-upon-delivery": "Payment & financial",
    "payment-upon-iot": "Payment & financial",
    "payment-upon-signature": "Payment & financial",
    "promissory-note": "Payment & financial",
    "promissory-note-md": "Payment & financial",
    "saft": "Payment & financial",
    "safte": "Payment & financial",
    "sales-contract-ru": "Payment & financial",

    # Real estate & leasing (4)
    "car-rental-tr": "Real estate & leasing",
    "rental-deposit": "Real estate & leasing",
    "rental-deposit-with": "Real estate & leasing",
    "roommate": "Real estate & leasing",

    # IP & licensing (1)
    "copyright-license": "IP & licensing",

    # Services & consulting (1)
    "servicelevelagreement": "Services & consulting",

    # Corporate & other (6)
    "certificate-of-incorporation": "Corporate & other",
    "company-information": "Corporate & other",
    "contact-information": "Corporate & other",
    "docusign-connect": "Corporate & other",
    "project-information": "Corporate & other",
    "signature-block-title-name-date": "Corporate & other",
}

# --- synthetic templates ----------------------------------------------------------
# Synthetic names are generated from the CATEGORIES keys in generate_synthetic_templates.py
# (e.g. "employment-offer-01"), so they map by category prefix rather than by exact name.
SYNTHETIC_PREFIX_DOMAINS = {
    "employment-offer": "Employment & HR",
    "non-compete": "Employment & HR",
    "severance-agreement": "Employment & HR",
    "employment-termination": "Employment & HR",
    "nda-mutual": "Confidentiality & NDA",
    "nda-oneway": "Confidentiality & NDA",
    "confidentiality-clause": "Confidentiality & NDA",
    "software-license": "IP & licensing",
    "trademark-license": "IP & licensing",
    "ip-assignment": "IP & licensing",
    "patent-license": "IP & licensing",
    "content-licensing": "IP & licensing",
    "data-processing-agreement": "Data protection & privacy",
    "gdpr-privacy-clause": "Data protection & privacy",
    "data-breach-notification": "Data protection & privacy",
    "commercial-lease": "Real estate & leasing",
    "residential-lease": "Real estate & leasing",
    "sublease-agreement": "Real estate & leasing",
    "property-purchase": "Real estate & leasing",
    "consulting-agreement": "Services & consulting",
    "statement-of-work": "Services & consulting",
    "service-retainer": "Services & consulting",
    "maintenance-agreement": "Services & consulting",
    "limitation-of-liability": "Dispute, liability & risk",
    "indemnification-clause": "Dispute, liability & risk",
    "arbitration-clause": "Dispute, liability & risk",
    "warranty-clause": "Dispute, liability & risk",
    "loan-agreement": "Payment & financial",
    "personal-guarantee": "Payment & financial",
    "insurance-clause": "Payment & financial",
    "shareholder-agreement": "Corporate & other",
    "distribution-agreement": "Corporate & other",
    "advertising-agreement": "Corporate & other",
    "franchise-fee": "Corporate & other",
}


def domain_of(name):
    """Legal domain for a template name (real or synthetic). None if unrecognised."""
    if name in REAL_DOMAINS:
        return REAL_DOMAINS[name]
    for prefix, dom in sorted(SYNTHETIC_PREFIX_DOMAINS.items(), key=lambda kv: -len(kv[0])):
        if name.startswith(prefix):
            return dom
    return None


if __name__ == "__main__":
    from collections import Counter
    c = Counter(REAL_DOMAINS.values())
    n = len(REAL_DOMAINS)
    print(f"{n} real templates across {len(c)} domains")
    for d in DOMAIN_ORDER:
        if c[d]:
            print(f"  {c[d]:3d}  ({c[d]/n:4.0%})  {d}")
