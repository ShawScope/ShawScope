import { useState, useEffect } from "react";
import PageMeta from "@/components/PageMeta";
import SiteLayout from "@/components/SiteLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Newspaper, Ear, Snowflake, Footprints, Sun, Droplets, Shield, Heart, Clock, ArrowRight, TestTube, HelpCircle, ListChecks, Sparkles, Mic, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import BloodTestingPromo from "@/components/BloodTestingPromo";
import { supabase } from "@/integrations/supabase/client";
import blogHeidi from "@/assets/blog-heidi.jpg";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  readTime: string;
  content: string[];
  image?: string;
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Ear, Snowflake, Footprints, Sun, Droplets, Heart, Newspaper, Sparkles, Mic,
};

const staticPosts: BlogPost[] = [
  {
    id: "heidi-ai-scribe",
    title: "Meet Heidi: The AI Scribe Helping Me Focus On You",
    excerpt: "You may have noticed a small device on my chest during your appointment — here's exactly what Heidi does, and what she doesn't do.",
    date: "2026-05-16",
    category: "ShawScope News",
    icon: Sparkles,
    readTime: "3 min read",
    image: blogHeidi,
    content: [
      "If you've had a recent appointment with me, you may have spotted a small brown device clipped to my t-shirt with the word 'Heidi' on it. I wanted to take a moment to explain what it is and why I use it — because transparency matters when it comes to your care.",
      "Heidi is an AI documentation assistant. During your appointment, she listens to our conversation and helps me dictate accurate, detailed consultation notes straight into your record. This means I can give you my full attention instead of looking away to type, and your record ends up more thorough than if I were trying to remember every detail at the end of the day.",
      "Importantly: Heidi does NOT record or store audio. There is no playback. Nothing is kept that could ever be replayed. The device simply converts the conversation into structured care notes on the page — and the audio is discarded.",
      "All notes are reviewed, edited and signed off by me before being saved to your record. Heidi is a tool to assist — not a replacement for professional judgement.",
      "If at any point you'd prefer me not to use Heidi during your appointment, just let me know — either when booking, on arrival, or any time during the visit. I'll switch her off straight away and take notes by hand instead. Your comfort always comes first.",
      "You'll also see a small consent tile on the booking page so you know exactly what to expect before I arrive. As always, if you've got questions about anything in your care — just ask.",
    ],
  },
  {
    id: "summer-ear-care",
    title: "Summer Ear Care: Protecting Your Ears During the Warm Months",
    excerpt: "Swimming, festivals, and sunshine — summer brings unique challenges for ear health. Here's how to keep your ears happy this season.",
    date: "2026-03-01",
    category: "Ear Health",
    icon: Sun,
    readTime: "3 min read",
    content: [
      "Summer is a wonderful time, but it can bring some unique challenges for your ears. Whether you're heading to the beach, a music festival, or simply enjoying the garden, here are some simple tips to keep your ears comfortable.",
      "Swimming is one of the most common causes of ear problems in summer. Water trapped in the ear canal can soften existing wax, causing it to swell and block the canal. After swimming, tilt your head to each side and gently tug your earlobe to help water drain. Avoid poking your ears with fingers, towels, or cotton buds.",
      "If you're attending a concert or festival, consider wearing earplugs — especially if you'll be near speakers. Prolonged exposure to loud music can cause temporary or even permanent hearing damage. Musician's earplugs are designed to reduce volume without muffling the sound quality.",
      "Hot weather can also increase wax production in some people. If you notice a feeling of fullness or muffled hearing during the summer months, it may be worth booking an ear check. ShawScope offers home visits across Dorchester and Dorset — so you don't even need to leave the house.",
    ],
  },
  {
    id: "airpods-earwax",
    title: "Are AirPods Making Your Earwax Worse?",
    excerpt: "In-ear devices are everywhere — but daily use can contribute to wax build-up. Here's what you need to know.",
    date: "2026-02-15",
    category: "Ear Health",
    icon: Ear,
    readTime: "4 min read",
    content: [
      "AirPods, earbuds, and in-ear headphones have become a daily essential for millions of people. Whether you're on calls, listening to music, or catching up on podcasts, chances are you spend hours each day with something in your ears.",
      "What many people don't realise is that wearing in-ear devices regularly can push earwax deeper into the canal and prevent it from migrating out naturally. Your ears are designed to self-clean — the natural movement of your jaw while talking and chewing helps wax travel outward. Blocking this process with earbuds can lead to a gradual build-up.",
      "Signs that your earbuds might be contributing to wax issues include: reduced sound quality from your AirPods (even after cleaning them), a feeling of fullness in one or both ears, muffled hearing after removing your earbuds, and increased ear itchiness.",
      "Simple tips to help: Give your ears regular breaks — take your earbuds out for at least 10 minutes every hour. Clean your AirPods or earbuds after every use with a dry, soft cloth. If you notice wax build-up, use olive oil drops a couple of times a week. And if symptoms persist, book a professional ear check.",
      "At ShawScope, we see many patients who use earbuds daily and have noticed increased wax build-up. A quick microsuction appointment can clear things up — often with immediate results.",
    ],
  },
  {
    id: "what-to-expect-home-visit",
    title: "What to Expect from Your First ShawScope Home Visit",
    excerpt: "Never had a home visit for ear care or cryotherapy? Here's a step-by-step look at what happens when Matt arrives at your door.",
    date: "2026-02-01",
    category: "ShawScope News",
    icon: Heart,
    readTime: "3 min read",
    content: [
      "Booking a home visit for the first time can feel unfamiliar — especially if you're used to visiting a clinic or GP surgery. At ShawScope, we've designed the experience to be as relaxed and straightforward as possible.",
      "Before your appointment, you'll receive a digital consent form to complete online. This covers your medical history and consent for the visit. You'll also be asked to use olive oil ear drops for 3–5 days if you're coming for earwax removal.",
      "On the day, you'll get a live notification when Matt is on his way, including an estimated arrival time. When he arrives, he'll set up his professional ear care equipment — this takes just a couple of minutes. All you need is a sturdy chair, good lighting, and a power socket nearby.",
      "Matt will start with a thorough visual ear check using an otoscope. He'll explain his findings, discuss your options, and only proceed when you're comfortable.",
      "The session itself is typically quick — around 20–30 minutes for earwax removal. Afterwards, Matt will provide personalised aftercare advice and answer any questions. Payment is taken at the end of the appointment via card, contactless, bank transfer, or cash.",
      "Many patients tell us it's the most comfortable care experience they've had — and the best part? You don't even need to leave your sofa.",
    ],
  },
  {
    id: "cryotherapy-myths",
    title: "5 Common Myths About Cryotherapy Skin Sessions",
    excerpt: "From 'it's dangerous' to 'it doesn't work' — let's bust some common misconceptions about cryotherapy for skin lesions.",
    date: "2026-01-20",
    category: "Cryotherapy",
    icon: Snowflake,
    readTime: "4 min read",
    content: [
      "Cryotherapy for skin lesions is a well-established, effective care — but there are still plenty of myths and misconceptions floating around. Let's set the record straight.",
      "Myth 1: 'Cryotherapy is dangerous.' Cryotherapy is extremely safe when performed by a trained practitioner. It uses controlled freezing with nitrous oxide to target specific lesions without damaging surrounding tissue. It's been used in professional practice for decades.",
      "Myth 2: 'It's the same as the sprays you buy in pharmacies.' Over-the-counter freezing sprays are much weaker than professional cryotherapy devices. Professional treatment uses precise, controlled application at much lower temperatures, which is significantly more effective — especially for stubborn warts and verrucas.",
      "Myth 3: 'It hurts a lot.' Most patients describe a brief stinging or cold sensation during treatment, lasting just a few seconds. Any discomfort typically subsides quickly. Many patients are surprised by how tolerable it is.",
      "Myth 4: 'One treatment never works.' Many lesions — especially skin tags, cherry angiomas, and seborrhoeic keratoses — are resolved in a single session. Stubborn warts or verrucas may require 2–3 treatments, but results are generally very good.",
      "Myth 5: 'You need to go to a clinic.' Not anymore! ShawScope brings professional cryotherapy directly to your home across Dorchester and Dorset. No waiting rooms, no travel — just effective care in the comfort of your own home.",
    ],
  },
  {
    id: "foot-health-launch",
    title: "Exciting News: Foot Health Services Coming to ShawScope",
    excerpt: "We're expanding! ShawScope will be offering professional foot health care from late September 2026.",
    date: "2026-01-10",
    category: "ShawScope News",
    icon: Footprints,
    readTime: "2 min read",
    content: [
      "We're thrilled to announce that ShawScope will be adding professional foot health services to our home visit offering from late September 2026.",
      "The new service will include routine nail care (cutting, thickened nails, fungal nail care), corn and callus care, verruca care, diabetic foot assessments, ingrown toenail management, and general foot health checks.",
      "Just like our earwax removal and cryotherapy services, foot health appointments will be carried out in the comfort of your own home. Matt has completed specialist training in Foot Health Practice and will bring the same high standards of care and professional standards that ShawScope is known for.",
      "If you'd like to be among the first to book when the service launches, you can register your interest now on our Foot Health page. We'll notify you as soon as appointments become available.",
      "We're really looking forward to helping even more people across Dorchester and Dorset with their wellbeing needs — from ears to toes!",
    ],
  },
  {
    id: "olive-oil-guide",
    title: "The Complete Guide to Using Olive Oil Ear Drops",
    excerpt: "Simple, safe, and effective — here's everything you need to know about preparing your ears before an earwax removal appointment.",
    date: "2025-12-15",
    category: "Ear Health",
    icon: Droplets,
    readTime: "3 min read",
    content: [
      "Olive oil ear drops are one of the simplest and most effective ways to prepare for earwax removal. Using them before your appointment can make the procedure quicker, more comfortable, and more effective.",
      "How to use them: Warm the olive oil to room temperature (never use hot oil). Using a dropper, place 2–3 drops of olive oil into the ear canal. Gently massage around the ear for 10–20 seconds, then let the oil drain out. Repeat on the other side if needed.",
      "When to start: We recommend using olive oil drops for 3–5 days before your appointment. Twice a day (morning and evening) is ideal. This gives the oil enough time to soften hardened wax.",
      "What to avoid: Don't use cotton buds to 'help' the process — this can push wax deeper. Avoid hydrogen peroxide drops unless specifically advised by a healthcare professional. And please don't use ear candles — they're ineffective and can be dangerous.",
      "If you have a perforated eardrum or grommets, check with your GP before using ear drops. Matt will always assess your ears before starting and can advise if you have any concerns.",
      "You can buy olive oil ear drops from most pharmacies, or simply use food-grade olive oil with a clean dropper. Simple, safe, and it makes a real difference to your appointment.",
    ],
  },
];

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const categoryColors: Record<string, string> = {
  "Ear Health": "bg-secondary/15 text-secondary",
  "Cryotherapy": "bg-blue-500/15 text-blue-400",
  "ShawScope News": "bg-emerald-500/15 text-emerald-400",
  "Foot Health": "bg-rose-500/15 text-rose-400",
};

const sectionTabs = [
  { label: "Articles", href: "#articles", icon: Newspaper },
  { label: "Offers", href: "#offers", icon: Tag },
  { label: "Blood Tests", href: "#blood-tests", icon: TestTube },
  { label: "How It Works", href: "#how-it-works", icon: ListChecks },
  { label: "FAQs", href: "#blood-test-faqs", icon: HelpCircle },
];

const categoryTabs = [
  { label: "All", value: "All", icon: Newspaper },
  { label: "Ear Health", value: "Ear Health", icon: Ear },
  { label: "Cryotherapy", value: "Cryotherapy", icon: Snowflake },
  { label: "Foot Health", value: "Foot Health", icon: Footprints },
  { label: "ShawScope News", value: "ShawScope News", icon: Heart },
];

const BlogPage = () => {
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [dbPosts, setDbPosts] = useState<BlogPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [offers, setOffers] = useState<Array<{
    id: string;
    offer_name: string;
    description: string | null;
    price_text: string;
    price_note: string | null;
    valid_from: string | null;
    valid_until: string | null;
    service_name: string | null;
  }>>([]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("service_offers")
      .select("id, offer_name, description, price_text, price_note, valid_from, valid_until, sort_order, services(name)")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (!data) return;
        const active = (data as any[]).filter((o) => {
          if (o.valid_from && o.valid_from > today) return false;
          if (o.valid_until && o.valid_until < today) return false;
          return true;
        });
        setOffers(active.map((o) => ({
          id: o.id,
          offer_name: o.offer_name,
          description: o.description,
          price_text: o.price_text,
          price_note: o.price_note,
          valid_from: o.valid_from,
          valid_until: o.valid_until,
          service_name: o.services?.name ?? null,
        })));
      });
  }, []);

  useEffect(() => {
    supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, content, category, icon_name, image_url, read_time, published_at, created_at")
      .eq("status", "approved")
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        setDbPosts(
          data.map((p: any) => ({
            id: p.slug,
            title: p.title,
            excerpt: p.excerpt,
            date: (p.published_at || p.created_at || "").slice(0, 10),
            category: p.category,
            icon: ICON_MAP[p.icon_name] || Newspaper,
            readTime: p.read_time,
            content: Array.isArray(p.content) ? p.content : [],
            image: p.image_url || undefined,
          }))
        );
      });
  }, []);

  const allPosts = [...dbPosts, ...staticPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const posts = activeCategory === "All"
    ? allPosts
    : allPosts.filter((p) => p.category === activeCategory);

  const scrollToSection = (href: string) => {
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <SiteLayout>
      <PageMeta
        title="News, Offers & Health Tips"
        description="ShawScope news, ear care tips, cryotherapy advice, foot health guides and special offers for patients across Dorchester and Dorset."
        path="/blog"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "ShawScope Blog",
          url: "https://www.shawscope.co.uk/blog",
          blogPost: staticPosts.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            description: p.excerpt,
            datePublished: p.date,
            articleSection: p.category,
            author: { "@type": "Person", name: "Matt Shaw" },
            publisher: { "@type": "Organization", name: "ShawScope" },
            mainEntityOfPage: `https://www.shawscope.co.uk/blog#${p.id}`,
          })),
        }}
      />

      {/* Hero */}
      <section className="bg-surface-dark py-12 sm:py-20 text-center text-primary-foreground">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="container mx-auto px-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-block mb-4"
          >
            <Newspaper className="h-10 w-10 text-secondary" />
          </motion.div>
          <h1 className="font-serif text-3xl sm:text-5xl uppercase tracking-wide">
            News & Special Offers
          </h1>
          <p className="mt-3 text-primary-foreground/60 max-w-xl mx-auto text-sm sm:text-base">
            Tips, advice, special offers and updates from ShawScope
          </p>
        </motion.div>
      </section>

      {/* Section Tabs */}
      <nav className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {sectionTabs.map((tab) => (
              <button
                key={tab.href}
                onClick={() => scrollToSection(tab.href)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-secondary hover:bg-secondary/10 rounded-lg transition-colors whitespace-nowrap"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Posts */}
      <section id="articles" className="py-12 sm:py-16 scroll-mt-20">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div {...fadeUp} className="text-center mb-10">
            <h2 className="font-serif text-2xl uppercase tracking-wide">Latest Articles</h2>
            <p className="text-muted-foreground text-sm mt-1">Health tips, guides and ShawScope news</p>
          </motion.div>

          {/* Category Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide -mx-4 px-4 justify-start sm:justify-center">
            {categoryTabs.map((tab) => {
              const active = activeCategory === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveCategory(tab.value)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                    active
                      ? "bg-secondary text-secondary-foreground border-secondary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-secondary/40 hover:text-secondary"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-6">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <CardContent className="p-0">
                    {post.image ? (
                      <div className="relative w-full aspect-[16/9] overflow-hidden bg-muted">
                        <img
                          src={post.image}
                          alt={post.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="relative w-full aspect-[16/4] bg-gradient-to-br from-secondary/20 via-secondary/10 to-background flex items-center justify-center">
                        <post.icon className="h-14 w-14 text-secondary/60" />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge variant="secondary" className={categoryColors[post.category] || "bg-secondary/15 text-secondary"}>
                          {post.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {post.readTime}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(post.date)}
                        </span>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="hidden sm:flex flex-shrink-0 h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                          <post.icon className="h-6 w-6 text-secondary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-serif text-xl sm:text-2xl mb-2 leading-tight">{post.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
                        </div>
                      </div>

                      {expandedPost === post.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.4 }}
                          className="mt-6 space-y-4 border-t border-border pt-6"
                        >
                          {post.content.map((paragraph, pi) => (
                            <p key={pi} className="text-sm text-muted-foreground leading-relaxed">
                              {paragraph}
                            </p>
                          ))}
                        </motion.div>
                      )}

                      <button
                        onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                        className="mt-4 text-sm font-medium text-secondary hover:text-secondary/80 transition-colors flex items-center gap-1 group"
                      >
                        {expandedPost === post.id ? "Show less" : "Read more"}
                        <ArrowRight className={`h-3.5 w-3.5 transition-transform duration-300 ${expandedPost === post.id ? "rotate-90" : "group-hover:translate-x-1"}`} />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Compact Special Offers */}
      {offers.length > 0 && (
        <section id="offers" className="py-10 sm:py-12 bg-muted scroll-mt-20">
          <div className="container mx-auto max-w-4xl px-4">
            <motion.div {...fadeUp} className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-2">
                <Tag className="h-5 w-5 text-secondary" />
                <h2 className="font-serif text-2xl uppercase tracking-wide">Current Offers</h2>
              </div>
              <p className="text-muted-foreground text-sm">All active ShawScope offers in one place</p>
            </motion.div>
            <motion.div {...fadeUp}>
              <Card className="border border-secondary/20 shadow-md overflow-hidden">
                <CardContent className="p-0 divide-y divide-border">
                  {offers.map((o) => (
                    <div key={o.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground text-sm sm:text-base">{o.offer_name}</h3>
                          {o.service_name && (
                            <Badge variant="secondary" className="bg-secondary/15 text-secondary text-[10px]">
                              {o.service_name}
                            </Badge>
                          )}
                        </div>
                        {o.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{o.description}</p>
                        )}
                        {(o.valid_from || o.valid_until) && (
                          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {o.valid_from && formatDate(o.valid_from)}
                            {o.valid_from && o.valid_until && " – "}
                            {o.valid_until && formatDate(o.valid_until)}
                          </p>
                        )}
                      </div>
                      <div className="sm:text-right shrink-0">
                        <p className="text-lg font-bold text-secondary leading-tight">{o.price_text}</p>
                        {o.price_note && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{o.price_note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <div className="text-center mt-5">
                <Link to="/book">
                  <Button size="sm" className="gap-2">
                    <CalendarDays className="h-4 w-4" /> Book to Claim
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Permanent MediChecks Feature */}
      <BloodTestingPromo variant="full" />

      {/* CTA */}
      <section className="py-12 sm:py-16 text-center bg-muted">
        <motion.div {...fadeUp} className="container mx-auto px-4">
          <Shield className="mx-auto h-8 w-8 text-secondary mb-4" />
          <h2 className="font-serif text-3xl mb-4 uppercase tracking-wide">Need Expert Help?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Whether it's earwax, a skin lesion, or general advice — we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/faqs">
              <Button size="lg" variant="outline" className="min-w-[200px] transition-all duration-300 hover:scale-105">
                View FAQs
              </Button>
            </Link>
            <Link to="/book">
              <Button size="lg" className="min-w-[200px] transition-all duration-300 hover:scale-105">
                <CalendarDays className="mr-2 h-4 w-4" /> Book an Appointment
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </SiteLayout>
  );
};

export default BlogPage;
