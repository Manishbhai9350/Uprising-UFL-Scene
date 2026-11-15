import { r as React } from "../react.js";

const createElement = React.createElement;

function AboutBlock({ block, index, visible, emailHref }) {
  const headlineColor = index < 2 ? "text-primary" : "text-primary-light";
  const subheadlineColor = index < 2 ? "text-primary-light" : "text-primary";
  const headlineClass =
    "font-heading text-h2 md:text-h2-lg -my-[.1em]";
  const paragraphClass =
    "font-condensed text-large md:text-large-lg overflow-hidden";
  const children = [
    createElement(
      "div",
      { className: "about-headline-window", key: "headline" },
      createElement(index === 0 ? "h2" : "h3", {
        className: `${headlineClass} ${headlineColor}`,
        dangerouslySetInnerHTML: { __html: block.headline },
        "data-about-headline": "",
      }),
    ),
    createElement(
      "p",
      {
        className: `about-subheadline ${paragraphClass} ${subheadlineColor}`,
        key: "subheadline",
      },
      createElement("span", {
        className: "block",
        dangerouslySetInnerHTML: { __html: block.subheadline },
        "data-about-subheadline": "",
      }),
    ),
  ];

  return createElement(
    "section",
    {
      className: `about-block${visible ? " is-visible" : ""}`,
      "data-about-block": "",
      "aria-label": `About ${index + 1}`,
      key: index,
    },
    createElement(
      "div",
      {
        className: `about-copy${visible ? " is-visible" : ""}`,
        "data-gsap-block": "",
      },
      createElement(
        "div",
        {
          className: `about-layout${index % 2 === 1 ? " is-reversed" : ""}`,
        },
        ...children,
      ),
      block.contacts &&
        createElement(
          "a",
          {
            href: emailHref,
            className:
              "about-contact relative inline-block w-full h-auto md:w-auto overflow-hidden transition-shadow duration-500 ease-out group bg-primary pt-[1.6rem] px-[2.4rem] pb-[1.2rem] before:absolute before:top-0 before:left-0 before:w-full before:h-full before:bg-white before:z-0 before:transition-transform before:duration-300 before:ease-out before:translate-y-0 hover:before:-translate-y-full shadow-[0_0_40px_5px_rgba(255,255,255,.5)] hover:shadow-[0_0_40px_5px_rgba(228,103,103,.6)]",
            "data-about-button": "",
          },
          createElement(
            "span",
            {
              "data-label": block.contacts,
              className:
                "relative font-condensed text-regular-lg inline-block overflow-hidden z-10 after:content-[attr(data-label)] after:text-primary after:absolute after:top-0 after:left-0 after:w-full after:h-full after:translate-y-full after:transition-transform after:duration-300 group-hover:after:translate-y-0 text-primary after:text-white",
            },
            createElement(
              "span",
              {
                className:
                  "relative inline-block transition-transform duration-300 group-hover:-translate-y-full",
              },
              block.contacts,
            ),
          ),
        ),
    ),
  );
}

export default function AboutContent({ configuration, scrollProgress }) {
  const scroller = React.useRef(null);
  const [visibleBlocks, setVisibleBlocks] = React.useState(() => new Set());
  const blocks = configuration.scene.contents.blocks;
  const emailHref = configuration.locale.footer.email.href;

  React.useEffect(() => {
    const element = scroller.current;
    if (!element) return undefined;

    let targetScroll = element.scrollTop;
    let animationFrame = 0;
    let smoothingWheel = false;

    const updateProgress = () => {
      const scrollLimit = element.scrollHeight - element.clientHeight;
      scrollProgress.current = scrollLimit > 0
        ? element.scrollTop / scrollLimit
        : 0;
    };

    const handleScroll = () => {
      if (!smoothingWheel) targetScroll = element.scrollTop;
      updateProgress();
    };

    const animateWheel = () => {
      const scrollLimit = element.scrollHeight - element.clientHeight;
      targetScroll = Math.max(0, Math.min(targetScroll, scrollLimit));
      const distance = targetScroll - element.scrollTop;
      if (Math.abs(distance) < 0.5) {
        element.scrollTop = targetScroll;
        smoothingWheel = false;
        animationFrame = 0;
        updateProgress();
        return;
      }

      element.scrollTop += distance * 0.1;
      animationFrame = window.requestAnimationFrame(animateWheel);
    };

    const handleWheel = (event) => {
      if (event.ctrlKey || event.deltaY === 0) return;
      event.preventDefault();
      if (!smoothingWheel) targetScroll = element.scrollTop;
      smoothingWheel = true;
      const scale = event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? element.clientHeight
          : 1;
      targetScroll += event.deltaY * scale;
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(animateWheel);
      }
    };

    element.addEventListener("scroll", handleScroll, { passive: true });
    element.addEventListener("wheel", handleWheel, { passive: false });
    updateProgress();

    return () => {
      element.removeEventListener("scroll", handleScroll);
      element.removeEventListener("wheel", handleWheel);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [scrollProgress]);

  React.useEffect(() => {
    const element = scroller.current;
    if (!element) return undefined;

    const sections = element.querySelectorAll("[data-about-block]");
    if (!("IntersectionObserver" in window)) {
      setVisibleBlocks(new Set(sections.keys()));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleBlocks((current) => {
          const next = new Set(current);
          for (const entry of entries) {
            const index = Array.prototype.indexOf.call(sections, entry.target);
            if (entry.isIntersecting) next.add(index);
            else next.delete(index);
          }
          return next;
        });
      },
      { root: element, threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [blocks]);

  if (!Array.isArray(blocks) || !emailHref) {
    throw new Error("About content or contact email is missing from config.");
  }

  return createElement(
    "section",
    {
      className: "about-experience",
      "aria-label": "About Uprising",
    },
    createElement("h1", { className: "sr-only" }, "About"),
    createElement(
      "div",
      {
        className: "about-scroller",
        ref: scroller,
        tabIndex: 0,
        "aria-label": "Scroll through About",
      },
      ...blocks.map((block, index) =>
        createElement(AboutBlock, {
          block,
          index,
          visible: visibleBlocks.has(index),
          emailHref,
          key: index,
        }),
      ),
      createElement("div", {
        className: "about-scroll-spacer",
        "aria-hidden": "true",
      }),
    ),
  );
}
