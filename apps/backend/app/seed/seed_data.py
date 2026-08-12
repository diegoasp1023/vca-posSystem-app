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
from app.models.menu_item import MenuCategory, MenuItem
from app.models.product import Presentation, Product
from app.models.tab import TabPaymentMethod

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

TAB_PAYMENT_METHODS = [
    {"name": "Efectivo"},
    {"name": "Tarjeta de crédito o débito"},
    {"name": "Nequi"},
    {"name": "Daviplata"},
    {"name": "Transferencia"},
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


MENU_CATEGORIES = [
    {"key": "bebidas_calientes", "name_es": "Bebidas calientes", "name_en": "Hot drinks", "sort_order": 1},
    {"key": "bebidas_frias", "name_es": "Bebidas frías", "name_en": "Cold drinks", "sort_order": 2},
    {
        "key": "desayunos",
        "name_es": "Desayunos & Acompañamientos de sal",
        "name_en": "Breakfast & Savory sides",
        "sort_order": 3,
    },
    {
        "key": "dulces",
        "name_es": "Acompañamientos dulces",
        "name_en": "Sweet sides",
        "sort_order": 4,
    },
    {"key": "para_llevar", "name_es": "Para llevar", "name_en": "To go", "sort_order": 5},
]

MENU_ITEMS = [
    # Bebidas calientes / Hot drinks
    {"category": "bebidas_calientes", "name_es": "Agua de panela", "name_en": "Panela water", "price_cop": 8000},
    {"category": "bebidas_calientes", "name_es": "Americano 6 Oz", "name_en": "Americano 6 oz", "price_cop": 7400},
    {"category": "bebidas_calientes", "name_es": "Americano 9 Oz", "name_en": "Americano 9 oz", "price_cop": 8000},
    {
        "category": "bebidas_calientes",
        "name_es": "Aromática de flor de Jamaica",
        "name_en": "Hibiscus flower herbal tea",
        "price_cop": 8000,
    },
    {
        "category": "bebidas_calientes",
        "name_es": "Aromática de frutas",
        "name_en": "Fruit herbal tea",
        "price_cop": 8900,
    },
    {
        "category": "bebidas_calientes",
        "name_es": "Aromática de hierbas",
        "name_en": "Herbal tea",
        "price_cop": 7500,
    },
    {"category": "bebidas_calientes", "name_es": "Café Campesino", "name_en": "Café Campesino", "price_cop": 9000},
    {"category": "bebidas_calientes", "name_es": "Café Latte 6 Oz", "name_en": "Café Latte 6 oz", "price_cop": 8900},
    {"category": "bebidas_calientes", "name_es": "Café Latte 9 Oz", "name_en": "Café Latte 9 oz", "price_cop": 9900},
    {
        "category": "bebidas_calientes",
        "name_es": "Café filtrado x 1",
        "name_en": "Filter coffee x 1",
        "price_cop": 9900,
    },
    {
        "category": "bebidas_calientes",
        "name_es": "Café filtrado x 2",
        "name_en": "Filter coffee x 2",
        "price_cop": 18000,
    },
    {
        "category": "bebidas_calientes",
        "name_es": "Café filtrado x 3",
        "name_en": "Filter coffee x 3",
        "price_cop": 27000,
    },
    {"category": "bebidas_calientes", "name_es": "Cappuccino 6 Oz", "name_en": "Cappuccino 6 oz", "price_cop": 8900},
    {"category": "bebidas_calientes", "name_es": "Cappuccino 9 Oz", "name_en": "Cappuccino 9 oz", "price_cop": 9900},
    {"category": "bebidas_calientes", "name_es": "Carajillo", "name_en": "Carajillo", "price_cop": 11000},
    {"category": "bebidas_calientes", "name_es": "Chocolate 6 Oz", "name_en": "Hot chocolate 6 oz", "price_cop": 8900},
    {"category": "bebidas_calientes", "name_es": "Chocolate 9 Oz", "name_en": "Hot chocolate 9 oz", "price_cop": 9900},
    {"category": "bebidas_calientes", "name_es": "Espresso doble", "name_en": "Double espresso", "price_cop": 8000},
    {"category": "bebidas_calientes", "name_es": "Espresso sencillo", "name_en": "Single espresso", "price_cop": 7400},
    {"category": "bebidas_calientes", "name_es": "Flat white", "name_en": "Flat white", "price_cop": 9900},
    {"category": "bebidas_calientes", "name_es": "Macchiato 3 Oz", "name_en": "Macchiato 3 oz", "price_cop": 8400},
    {"category": "bebidas_calientes", "name_es": "Macchiato 6 Oz", "name_en": "Macchiato 6 oz", "price_cop": 9900},
    {"category": "bebidas_calientes", "name_es": "Mocaccino 9 Oz", "name_en": "Mocaccino 9 oz", "price_cop": 11400},
    {"category": "bebidas_calientes", "name_es": "Té matcha", "name_en": "Matcha tea", "price_cop": 12000},
    {"category": "bebidas_calientes", "name_es": "Té Stash en agua", "name_en": "Stash tea in water", "price_cop": 8900},
    {
        "category": "bebidas_calientes",
        "name_es": "Té en bebida vegetal",
        "name_en": "Tea with plant-based milk",
        "price_cop": 9900,
    },
    {"category": "bebidas_calientes", "name_es": "Té chai - Diosa", "name_en": "Chai tea - Diosa", "price_cop": 10900},
    # Bebidas frías / Cold drinks
    {"category": "bebidas_frias", "name_es": "Agua", "name_en": "Water", "price_cop": 5800},
    {
        "category": "bebidas_frias",
        "name_es": "Cerveza Tres Cordilleras",
        "name_en": "Tres Cordilleras beer",
        "price_cop": 11000,
    },
    {"category": "bebidas_frias", "name_es": "Cerveza artesanal", "name_en": "Craft beer", "price_cop": 13000},
    {"category": "bebidas_frias", "name_es": "Cold Brew", "name_en": "Cold Brew", "price_cop": 14000},
    {"category": "bebidas_frias", "name_es": "Copa de vino", "name_en": "Glass of wine", "price_cop": 17000},
    {"category": "bebidas_frias", "name_es": "Espresso affogato", "name_en": "Espresso affogato", "price_cop": 13000},
    {"category": "bebidas_frias", "name_es": "Gaseosa de frutas", "name_en": "Fruit soda", "price_cop": 9000},
    {"category": "bebidas_frias", "name_es": "Granizado de café", "name_en": "Coffee granita", "price_cop": 13000},
    {"category": "bebidas_frias", "name_es": "Jugo", "name_en": "Juice", "price_cop": 11900},
    {
        "category": "bebidas_frias",
        "name_es": "Jugo en bebida vegetal",
        "name_en": "Juice with plant-based milk",
        "price_cop": 15000,
    },
    {"category": "bebidas_frias", "name_es": "Kombucha", "name_en": "Kombucha", "price_cop": 9500},
    {"category": "bebidas_frias", "name_es": "Malteada de café", "name_en": "Coffee milkshake", "price_cop": 17000},
    {"category": "bebidas_frias", "name_es": "Soda de la casa", "name_en": "House soda", "price_cop": 11000},
    {
        "category": "bebidas_frias",
        "name_es": "Vaso de bebida vegetal",
        "name_en": "Cup of plant-based milk",
        "price_cop": 8000,
    },
    # Desayunos & Acompañamientos de sal / Breakfast & Savory sides
    {
        "category": "desayunos",
        "name_es": "Granola de la casa",
        "name_en": "House granola",
        "description_es": "Con yogurt de coco y fruta de temporada.",
        "description_en": "With coconut yogurt and seasonal fruit.",
        "price_cop": 22000,
    },
    {"category": "desayunos", "name_es": "Croissant", "name_en": "Croissant", "price_cop": 7500},
    {
        "category": "desayunos",
        "name_es": "Tamal tolimense",
        "name_en": "Tolima-style tamal",
        "description_es": "Arroz, arveja, proteína de garbanzo, quinua, zanahoria, entre otros.",
        "description_en": "Rice, peas, chickpea protein, quinoa, carrot, among others.",
        "price_cop": 12500,
    },
    {
        "category": "desayunos",
        "name_es": "Empanada de papa x2",
        "name_en": "Potato empanada x2",
        "description_es": "Papa, proteína de soya, cilantro y cebolla.",
        "description_en": "Potato, soy protein, cilantro and onion.",
        "price_cop": 14000,
    },
    {
        "category": "desayunos",
        "name_es": "Tamal de pipián",
        "name_en": "Pipián tamal",
        "description_es": "Papa criolla, arroz, arveja, harina de maíz, proteína de soya, gluten, quinua, entre otros.",
        "description_en": "Creole potato, rice, peas, corn flour, soy protein, gluten, quinoa, among others.",
        "price_cop": 12500,
    },
    {
        "category": "desayunos",
        "name_es": "Empanada horneada",
        "name_en": "Baked empanada",
        "description_es": "Quinua, salchicha de soya y pimentón.",
        "description_en": "Quinoa, soy sausage and bell pepper.",
        "price_cop": 8500,
    },
    {
        "category": "desayunos",
        "name_es": "Tamal grande",
        "name_en": "Large tamal",
        "description_es": "Gluten, arveja, maíz, arroz, proteína de soya, papa, quinua, entre otros.",
        "description_en": "Gluten, peas, corn, rice, soy protein, potato, quinoa, among others.",
        "price_cop": 17500,
    },
    {
        "category": "desayunos",
        "name_es": "Tamal con bebida de café o chocolate",
        "name_en": "Tamal with coffee or hot chocolate",
        "price_cop": 21000,
    },
    {
        "category": "desayunos",
        "name_es": "Tartine",
        "name_en": "Tartine",
        "description_es": (
            "Pan de masa madre y hummus de garbanzo con: tomates secos y pesto / "
            "aguacate y tomates cherry / remolacha, aguacate y rábanos."
        ),
        "description_en": (
            "Sourdough bread and chickpea hummus with: sun-dried tomatoes and pesto / "
            "avocado and cherry tomatoes / beet, avocado and radishes."
        ),
        "price_cop": 23200,
    },
    {
        "category": "desayunos",
        "name_es": "Tofus revueltos",
        "name_en": "Scrambled tofu",
        "description_es": "Con cebolla y tomate, arepa de peto y bebida de café o chocolate.",
        "description_en": "With onion and tomato, corn arepa and coffee or hot chocolate.",
        "price_cop": 21500,
    },
    {
        "category": "desayunos",
        "name_es": "Waffle de avena",
        "name_en": "Oat waffle",
        "description_es": "Con almendras, dátiles, fruta de temporada y mermelada o chocolate.",
        "description_en": "With almonds, dates, seasonal fruit and jam or chocolate.",
        "price_cop": 19000,
    },
    # Acompañamientos dulces / Sweet sides
    {"category": "dulces", "name_es": "Bombón", "name_en": "Bonbon", "price_cop": 5000},
    {"category": "dulces", "name_es": "Brownie", "name_en": "Brownie", "price_cop": 8800},
    {"category": "dulces", "name_es": "Brownie con helado", "name_en": "Brownie with ice cream", "price_cop": 16000},
    {
        "category": "dulces",
        "name_es": "Cheesecake de marañón",
        "name_en": "Cashew cheesecake",
        "description_es": "Galleta de dátiles y almendra, crema de marañón y coco con fruta o mermelada.",
        "description_en": "Date and almond cookie base, cashew and coconut cream with fruit or jam.",
        "price_cop": 16000,
    },
    {
        "category": "dulces",
        "name_es": "Galleta de avena con chocolate o arándanos",
        "name_en": "Oat cookie with chocolate or blueberries",
        "price_cop": 7000,
    },
    {"category": "dulces", "name_es": "Helado (1 bola)", "name_en": "Ice cream (1 scoop)", "price_cop": 7900},
    {"category": "dulces", "name_es": "Helado (2 bolas)", "name_en": "Ice cream (2 scoops)", "price_cop": 14000},
    {
        "category": "dulces",
        "name_es": "Muffin",
        "name_en": "Muffin",
        "description_es": "Almendra, harina de arroz, panela orgánica, frambuesas y arándanos.",
        "description_en": "Almond, rice flour, organic panela, raspberries and blueberries.",
        "price_cop": 9900,
    },
    {
        "category": "dulces",
        "name_es": "Pavlova",
        "name_en": "Pavlova",
        "description_es": "Merengue, crema y frutas de temporada.",
        "description_en": "Meringue, cream and seasonal fruit.",
        "price_cop": 13000,
    },
    {
        "category": "dulces",
        "name_es": "Perlas del trópico",
        "name_en": "Tropical pearls",
        "description_es": "Perlas de tapioca, leche de coco y mermelada de mango.",
        "description_en": "Tapioca pearls, coconut milk and mango jam.",
        "price_cop": 11000,
    },
    {"category": "dulces", "name_es": "Porción de torta", "name_en": "Slice of cake", "price_cop": 12000},
    # Para llevar / To go (sin precio en el menú actual)
    {"category": "para_llevar", "name_es": "Café en grano o molido", "name_en": "Whole bean or ground coffee"},
    {"category": "para_llevar", "name_es": "Mantequilla de maní", "name_en": "Peanut butter"},
    {"category": "para_llevar", "name_es": "Mantequilla de almendras", "name_en": "Almond butter"},
    {"category": "para_llevar", "name_es": "Ají", "name_en": "Ají hot sauce"},
    {
        "category": "para_llevar",
        "name_es": "Tortas completas",
        "name_en": "Whole cakes",
        "description_es": "Disponibles en presentaciones de 12 a 15, 6 a 8 o 3 a 4 porciones.",
        "description_en": "Available in 12-15, 6-8, or 3-4 serving sizes.",
    },
    {"category": "para_llevar", "name_es": "Botella de vino", "name_en": "Bottle of wine"},
    {"category": "para_llevar", "name_es": "Bebida vegetal", "name_en": "Plant-based milk"},
    {"category": "para_llevar", "name_es": "Matcha", "name_en": "Matcha"},
    {"category": "para_llevar", "name_es": "Tamal", "name_en": "Tamal"},
]


async def _seed_products_and_courses() -> None:
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


async def _seed_menu() -> None:
    async with async_session_factory() as session:
        existing_category = await session.scalar(select(MenuCategory.id).limit(1))
        if existing_category is not None:
            print("Seed skipped: menu categories already exist.")
            return

        categories_by_key = {
            data["key"]: MenuCategory(
                name_es=data["name_es"], name_en=data["name_en"], sort_order=data["sort_order"]
            )
            for data in MENU_CATEGORIES
        }
        session.add_all(categories_by_key.values())

        for item_data in MENU_ITEMS:
            session.add(
                MenuItem(
                    category=categories_by_key[item_data["category"]],
                    name_es=item_data["name_es"],
                    name_en=item_data["name_en"],
                    description_es=item_data.get("description_es"),
                    description_en=item_data.get("description_en"),
                    price_cop=item_data.get("price_cop"),
                )
            )

        await session.commit()
        print(f"Seed complete: {len(MENU_CATEGORIES)} menu categories, {len(MENU_ITEMS)} menu items.")


async def _seed_tab_payment_methods() -> None:
    async with async_session_factory() as session:
        existing = await session.scalar(select(TabPaymentMethod.id).limit(1))
        if existing is not None:
            print("Seed skipped: tab payment methods already exist.")
            return

        for method_data in TAB_PAYMENT_METHODS:
            session.add(TabPaymentMethod(**method_data))

        await session.commit()
        print(f"Seed complete: {len(TAB_PAYMENT_METHODS)} tab payment methods.")


async def seed() -> None:
    await _seed_products_and_courses()
    await _seed_menu()
    await _seed_tab_payment_methods()


if __name__ == "__main__":
    asyncio.run(seed())
