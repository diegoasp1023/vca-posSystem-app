"""Loads the real Valiente Café content (currently hardcoded in the frontend)
into the database. Safe to re-run: skips seeding if products already exist.

Usage: uv run python -m app.seed.seed_data
"""

import asyncio

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.course import (
    Course,
    CourseContentModule,
    CourseCost,
    CourseObjective,
    PaymentMethod,
)
from app.models.product import Presentation, Product

PAYMENT_METHODS = [
    {
        "name_es": "Consignación a cuenta de ahorros Bancolombia",
        "name_en": "Bank transfer (Bancolombia savings account)",
    },
    {"name_es": "Tarjeta de crédito o débito", "name_en": "Credit or debit card"},
    {"name_es": "Nequi", "name_en": "Nequi"},
    {"name_es": "Daviplata", "name_en": "Daviplata"},
    {
        "name_es": "Pago 100% por adelantado al inscribirte",
        "name_en": "100% payment required upon enrollment",
    },
]

PRESENTATIONS = [
    {"name_es": "Molido", "name_en": "Ground"},
    {"name_es": "En grano", "name_en": "Whole bean"},
    {"name_es": "Soluble (instantáneo)", "name_en": "Instant"},
    {"name_es": "Cápsulas o monodosis", "name_en": "Capsules or pods"},
]

PRODUCTS = [
    {
        "name_es": "Café Lavado",
        "name_en": "Washed Coffee",
        "description_es": "Proceso lavado, notas dulces y acidez brillante.",
        "description_en": "Washed process, sweet notes and bright acidity.",
        "weight_grams": 500,
        "price_cop": 47000,
    },
    {
        "name_es": "Café Natural",
        "name_en": "Natural Coffee",
        "description_es": "Secado natural, cuerpo intenso y notas frutales.",
        "description_en": "Natural drying, full body and fruity notes.",
        "weight_grams": 340,
        "price_cop": 42000,
    },
    {
        "name_es": "Café Honey",
        "name_en": "Honey Coffee",
        "description_es": "Proceso honey, dulzor equilibrado y final limpio.",
        "description_en": "Honey process, balanced sweetness and clean finish.",
        "weight_grams": 340,
        "price_cop": 45000,
    },
    {
        "name_es": "Descafeinado",
        "name_en": "Decaf",
        "description_es": "Todo el sabor, sin cafeína.",
        "description_en": "All the flavor, without the caffeine.",
        "weight_grams": 340,
        "price_cop": 46000,
    },
]

COURSES = [
    {
        "slug": "fundamentos-de-barismo",
        "title_es": "Fundamentos de Barismo",
        "title_en": "Barista Fundamentals",
        "tagline_es": "Un viaje de la semilla a la taza",
        "tagline_en": "A journey from seed to cup",
        "image_url": "/images/courses/curso-barismo.jpg",
        "objectives": [
            (
                "Brindar las bases fundamentales sobre el café y sus elementos de preparación",
                "Provide the essential foundations of coffee and its preparation elements",
            ),
            (
                "Explorar el origen del cultivo y los métodos de procesamiento post-cosecha",
                "Explore the origins of cultivation and post-harvest processing methods",
            ),
            (
                "Dominar la historia, técnica y estándares de calidad del espresso",
                "Master the history, technique and quality standards of espresso",
            ),
            (
                "Desarrollar habilidades para preparar bebidas a base de espresso y leche vaporizada",
                "Develop skills to prepare espresso-based and steamed milk beverages",
            ),
            (
                "Aprender a preparar bebidas frías a base de espresso",
                "Learn to prepare cold espresso-based drinks",
            ),
        ],
        "content": [
            ("Aspectos generales (definiciones, cata)", "General aspects (definitions, tasting)", "3h"),
            ("Factores de calidad en el procesamiento", "Quality factors in processing", "3h"),
            ("Sistemas de espresso", "Espresso systems", "3h"),
            ("Bebidas a base de leche", "Milk-based beverages", "4h"),
        ],
        "duration_text_es": "12 horas en total. Horarios personalizados a convenir; reprogramar tiene un costo de $50.000 COP por día.",
        "duration_text_en": "12 hours total. Personalized schedules by arrangement; rescheduling costs $50,000 COP per day.",
        "cost": [
            (
                "Grupal (máx. 6 personas): $800.000 COP por persona",
                "Group (max. 6 people): $800,000 COP per person",
            ),
            (
                "Personalizada: $1.100.000 COP por persona",
                "Personalized: $1,100,000 COP per person",
            ),
            (
                "Ambas incluyen materiales y certificado de asistencia",
                "Both include materials and a completion certificate",
            ),
        ],
    },
    {
        "slug": "taller-de-latte-art",
        "title_es": "Taller de Latte Art",
        "title_en": "Latte Art Workshop",
        "tagline_es": "Explorando el arte de decorar los cafés",
        "tagline_en": "Exploring the art of decorating coffee",
        "image_url": "/images/courses/curso-latte-art.jpg",
        "objectives": [
            (
                "Introducir la historia y evolución del latte art",
                "Introduce the history and evolution of latte art",
            ),
            (
                "Dominar la técnica de vertido libre (free pouring)",
                "Master the free pouring technique",
            ),
            (
                "Aprender la técnica de etching (decorado con aguja)",
                "Learn the etching (needle decoration) technique",
            ),
            (
                "Practicar texturización avanzada de leche, incluidas bebidas vegetales",
                "Practice advanced milk texturizing, including plant-based milks",
            ),
        ],
        "content": [
            ("Conceptos avanzados de espresso", "Advanced espresso concepts", "2h"),
            ("Introducción al latte art", "Introduction to latte art", "30min"),
            ("Técnica de jarra y taza", "Jug and cup technique", "30min"),
            ("Texturización de leche", "Milk texturizing", "1.5h"),
            ("Taller de coreografía", "Choreography workshop", "1.5h"),
            ("Diseño cabeza de monje y corazón", "Monk head and heart design", "3h"),
            ("Diseño tulipán y rosetta", "Tulip and rosetta patterns", "3h"),
        ],
        "duration_text_es": "12 horas en total. Horarios personalizados a convenir; reprogramar tiene un costo de $50.000 COP por día.",
        "duration_text_en": "12 hours total. Personalized schedules by arrangement; rescheduling costs $50,000 COP per day.",
        "cost": [
            (
                "Grupal (máx. 6 personas): $800.000 COP por persona",
                "Group (max. 6 people): $800,000 COP per person",
            ),
            (
                "Personalizada: $1.100.000 COP por persona",
                "Personalized: $1,100,000 COP per person",
            ),
            (
                "Ambas incluyen materiales y certificado de asistencia",
                "Both include materials and a completion certificate",
            ),
        ],
    },
    {
        "slug": "taller-de-metodos-de-extraccion",
        "title_es": "Taller de métodos de extracción",
        "title_en": "Extraction Methods Workshop",
        "tagline_es": "La nueva tendencia del café: resaltar sus atributos naturales",
        "tagline_en": "The new coffee trend: highlighting its natural attributes",
        "image_url": "/images/courses/curso-extraccion.jpg",
        "objectives": [
            (
                "Comprender los conceptos esenciales de extracción y la diferenciación del café de especialidad",
                "Understand essential extraction concepts and specialty coffee differentiation",
            ),
            (
                "Conocer las bases de preparación en métodos alternativos",
                "Learn the basics of preparation with alternative brewing methods",
            ),
            (
                "Identificar las variables que afectan las características de la bebida final",
                "Identify the variables that affect the characteristics of the final drink",
            ),
        ],
        "content": [
            ("Introducción a la extracción", "Introduction to extraction", "2h"),
            ("Taller de variables de extracción", "Extraction variables workshop", "2h"),
            ("Taller de proceso de extracción", "Extraction process workshop", "1h"),
            ("Preparación en prensa francesa", "French press preparation", "1h"),
            ("Preparación en sifón", "Syphon preparation", "1h"),
            ("Preparación en Chemex", "Chemex preparation", "1h"),
            ("Preparación en V60 y Origami", "V60 and Origami dripper preparation", "1h"),
            ("Preparación en Aeropress", "Aeropress preparation", "1h"),
        ],
        "duration_text_es": "10 horas en total. Horarios personalizados a convenir; reprogramar tiene un costo de $50.000 COP por día.",
        "duration_text_en": "10 hours total. Personalized schedules by arrangement; rescheduling costs $50,000 COP per day.",
        "cost": [
            (
                "Grupal (máx. 6 personas): $800.000 COP por persona",
                "Group (max. 6 people): $800,000 COP per person",
            ),
            (
                "Personalizada: $1.100.000 COP por persona",
                "Personalized: $1,100,000 COP per person",
            ),
            (
                "Ambas incluyen materiales y certificado de asistencia",
                "Both include materials and a completion certificate",
            ),
        ],
    },
    {
        "slug": "taller-de-preparacion-para-aficionados",
        "title_es": "Taller de preparación para aficionados",
        "title_en": "Enthusiasts' Preparation Workshop",
        "tagline_es": "Las técnicas modernas de preparación y decoración con cafés de alta calidad",
        "tagline_en": "Modern brewing and decoration techniques using premium coffee",
        "image_url": "/images/courses/curso-aficionados.jpg",
        "objectives": [
            (
                "Comprender la calidad, manejo y preparación del café y sus equipos esenciales",
                "Understand coffee quality, handling, preparation and essential equipment",
            ),
            (
                "Dominar técnicas de preparación filtrada: prensa francesa, moka, V60 y aeropress",
                "Master filtered brewing: French press, moka pot, V60 and Aeropress",
            ),
            (
                "Aprender el manejo de la máquina de espresso para bebidas frías y calientes",
                "Learn to operate the espresso machine for hot and cold drinks",
            ),
            (
                "Preparar y decorar bebidas a base de espresso con leches vegetales texturizadas",
                "Prepare and decorate espresso-based drinks with textured plant-based milk",
            ),
        ],
        "content": [
            (
                "Fundamentos del café (calidad, cata comparativa)",
                "Coffee fundamentals (quality, comparative tasting)",
                "3h",
            ),
            ("Taller de métodos de preparación", "Brewing methods workshop", "3h"),
            (
                "Sistemas de espresso y bebidas vegetales",
                "Espresso systems and plant-based drinks",
                "3h",
            ),
        ],
        "duration_text_es": "9 horas en total. Horarios personalizados a convenir; reprogramar tiene un costo de $50.000 COP por día.",
        "duration_text_en": "9 hours total. Personalized schedules by arrangement; rescheduling costs $50,000 COP per day.",
        "cost": [
            (
                "Grupal (máx. 6 personas): $600.000 COP por persona",
                "Group (max. 6 people): $600,000 COP per person",
            ),
            (
                "Personalizada: $800.000 COP por persona",
                "Personalized: $800,000 COP per person",
            ),
            (
                "Ambas incluyen materiales y certificado de asistencia",
                "Both include materials and a completion certificate",
            ),
        ],
    },
]


async def seed() -> None:
    async with async_session_factory() as session:
        existing = await session.scalar(select(Product.id).limit(1))
        if existing is not None:
            print("Seed skipped: products already exist.")
            return

        presentations = [Presentation(**p) for p in PRESENTATIONS]
        session.add_all(presentations)

        payment_methods = [PaymentMethod(**m) for m in PAYMENT_METHODS]
        session.add_all(payment_methods)

        for product_data in PRODUCTS:
            session.add(Product(**product_data, presentations=presentations))

        for course_data in COURSES:
            course = Course(
                slug=course_data["slug"],
                title_es=course_data["title_es"],
                title_en=course_data["title_en"],
                tagline_es=course_data["tagline_es"],
                tagline_en=course_data["tagline_en"],
                image_url=course_data["image_url"],
                duration_text_es=course_data["duration_text_es"],
                duration_text_en=course_data["duration_text_en"],
                payment_methods=payment_methods,
            )
            course.objectives = [
                CourseObjective(sort_order=i, text_es=es, text_en=en)
                for i, (es, en) in enumerate(course_data["objectives"])
            ]
            course.content_modules = [
                CourseContentModule(
                    sort_order=i, module_es=es, module_en=en, duration_label=duration
                )
                for i, (es, en, duration) in enumerate(course_data["content"])
            ]
            course.costs = [
                CourseCost(sort_order=i, text_es=es, text_en=en)
                for i, (es, en) in enumerate(course_data["cost"])
            ]
            session.add(course)

        await session.commit()
        print("Seed complete: 4 products, 4 courses.")


if __name__ == "__main__":
    asyncio.run(seed())
