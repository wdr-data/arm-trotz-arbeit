(function () {
    const state = {};

    const labels = {
        m: "Männer",
        f: "Frauen",
    };
    const baseDomain = [labels.m, labels.f];

    const clamp = function (a, b, c) {
        return Math.max(a, Math.min(b, c))
    };

    const drawGraphs = function () {
        d3.selectAll('.you-draw-it').each(function () {
            const sel = d3.select(this);
            const key = this.dataset.key;
            const question = window.ydi_data[key];
            const { data, target } = question;
            if (!data || !data.m || !data.f) {
                console.log("No data available for:", key);
                return;
            }

            const nonTarget = target === 'm' ? 'f' : 'm';

            const valueList = Object.values(data);
            const maxY = d3.max(valueList);

            if (!state[key]) {
                state[key] = {
                    started: false,
                    resultShown: false,
                    value: 0,
                };
            }

            // make visual area empty
            sel.html('');

            const isMobile = window.innerWidth < 760;

            const formatValue = function (val, defaultPrecision) {
                const data = 'precision' in question ?
                    Number(val).toFixed(question.precision) :
                    defaultPrecision !== undefined ? Number(val).toFixed(defaultPrecision) : val;
                return String(data).replace('.', ',') + (question.unit ? ' ' + question.unit : '');
            };

            const applyMargin = function (sel) {
                sel.style("left", margin.left + "px")
                    .style("top", margin.top + "px")
                    .style("width", c.width + "px")
                    .style("height", c.height + "px");
            };

            const makeGraph = function (sel, x, y, width) {
                sel
                    .attr("x", x - (width / 2) + (c.x.bandwidth() / 2))
                    .attr("width", width)
                    .attr("y", y)
                    .attr("height", c.height - y);
            }
            const makeLabel = function (sel, x, y, text) {
                sel.classed("data-label", true)
                    .style("left", x + (c.x.bandwidth() / 2) + "px")
                    .style("top", y + "px")
                    .html("")
                    .append("span")
                    .text(text);
            }

            const margin = {
                top: 20,
                right: isMobile ? 50 : 150,
                bottom: 20,
                left: isMobile ? 100 : 150,
            };
            const width = sel.node().offsetWidth;
            const height = 400;
            const c = {
                width: width - (margin.left + margin.right),
                height: height - (margin.top + margin.bottom)
            };

            // configure scales
            const graphMinY = 0;
            const graphMaxY = 'maxY' in question ? question.maxY : maxY;
            c.x = d3.scaleBand().rangeRound([0, c.width]).padding(0.1);
            c.x.domain(question.target === 'm' ? Array.from(baseDomain).reverse() : baseDomain);
            c.xAxis = d3.axisBottom().scale(c.x);
            c.y = d3.scaleLinear().range([c.height, 0]);
            c.y.domain([graphMinY, graphMaxY]);
            c.yAxis = d3.axisLeft().scale(c.y).tickValues(c.y.ticks(6));
            c.yAxis.tickFormat(d => formatValue(d, question.unit, question.precision));

            const base = sel.append('svg')
                .attr("width", width)
                .attr("height", height)

            // patterns
            c.defs = base.append("defs");
            c.defs.append("pattern")
                .attr("id", "striped")
                .attr("width", 5).attr("height", 5)
                .attr("patternUnits", "userSpaceOnUse")
                .attr("patternTransform", "rotate(45 0 0)")
                .append("line")
                .attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 10)
                .classed("stripe-line", true)
            c.defs.append("marker")
                .attr("id", "preview-arrowp")
                .attr("orient", "auto")
                .attr("viewBox", "0 0 10 10")
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("refX", 1)
                .attr("refY", 5)
                .append("path")
                .attr("d", "M 0 0 L 10 5 L 0 10 z");

            c.svg = base.append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                .attr("width", c.width)
                .attr("height", c.height);

            c.labels = sel.append("div")
                .attr("class", "labels")
                .call(applyMargin);
            c.titles = sel.append("div")
                .attr("class", "titles")
                .call(applyMargin)
                .style("top", "0px");
            c.axis = c.svg.append("g");
            c.charts = c.svg.append("g").attr("class", "charts");

            c.axis.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + c.height + ")")
                .call(c.xAxis);

            c.axis.append("g")
                .attr("class", "y axis")
                .call(c.yAxis);

            // make background grid
            c.grid = c.svg.append('g')
                .attr('class', 'grid');
            c.grid.append('g').attr('class', 'vertical').call(
                d3.axisLeft(c.y)
                    .tickValues(c.y.ticks(6))
                    .tickFormat("")
                    .tickSize(-c.width)
            );

            setTimeout(() => {
                const clientRect = c.svg.node().getBoundingClientRect();
                c.top = clientRect.top + window.scrollY;
                c.bottom = clientRect.bottom + window.scrollY;
            }, 1000);

            // make first graph
            makeGraph(c.charts.append("rect").classed(`graph-${nonTarget}`, true), c.x(labels[nonTarget]), c.y(data[nonTarget]), c.x.bandwidth() / 3)
            makeLabel(c.labels.append("div").classed(`label-${nonTarget}`, true), c.x(labels[nonTarget]), c.y(data[nonTarget]), formatValue(data[nonTarget]))

            const resultSection = d3.select('.result.' + key);
            const userGraph = c.charts.append("rect")
                .attr("fill", "url(#striped)")
                .classed(`graph-user graph-${target}`, true);
            const userLabel = c.labels.append("div")
                .classed(`label-user label-${target}`, true)
            let userValue = c.y(0) - 20;
            if (state[key].started) {
                userValue = c.y(state[key].value);
                makeLabel(userLabel, c.x(labels[target]) * 0.9, c.y(state[key].value), `Ihre Schätzung: ${formatValue(state[key].value)}`);
            }
            makeGraph(userGraph, c.x(labels[target]) * 0.9, userValue, c.x.bandwidth() / 4);

            // add a preview pointer
            const xs = c.x(labels[target]) * 0.9 + (c.x.bandwidth() / 2);
            const ys = userValue - 5;
            const xArrowStart = xs + 45;
            const yArrowStart = ys - 50;
            const xTextStart = xArrowStart + 5;
            const yTextStart = yArrowStart - 10;

            c.preview = c.svg.append("path")
                .attr("class", "controls preview-pointer")
                .attr("marker-end", "url(#preview-arrowp)")
                .attr("d", "M" + xArrowStart + "," + yArrowStart +
                    " Q" + xs + "," + yArrowStart +
                    " " + xs + "," + (ys - 10));

            // add preview notice
            c.controls = sel.append("div")
                .attr("class", "controls")
                .call(applyMargin)

            c.controls.append("span")
                .style("left", xTextStart + "px")
                .style("top", yTextStart + "px")
                .classed("preview-text", true)
                .text("Ziehen Sie den Balken!");


            const interactionHandler = function () {
                if (state[key].resultShown) {
                    return;
                }

                sel.node().classList.add('drawn');

                const pos = d3.mouse(c.svg.node());
                const value = clamp(c.y.domain()[0], c.y.domain()[1], c.y.invert(pos[1]));
                state[key].value = value;

                makeGraph(userGraph, c.x(labels[target]) * 0.9, c.y(value), c.x.bandwidth() / 4);
                makeLabel(userLabel, c.x(labels[target]) * 0.9, c.y(state[key].value), `Ihre Schätzung: ${formatValue(value)}`);

                if (!state[key].started) {
                    state[key].started = true;
                    resultSection.node().classList.add('finished');
                    resultSection.select('button').node().removeAttribute('disabled');
                }
            };

            // invisible rect for dragging to work
            const dragArea = c.svg.append('rect')
                .attr('class', 'draggable')
                .attr('x', c.x(labels[question.target]))
                .attr('width', c.width / 2)
                .attr('height', c.height)
                .attr('opacity', 0);
            dragArea.call(d3.drag().on('drag', interactionHandler));
            c.svg.on('click', interactionHandler);

            const resultChart = c.charts.append("rect").classed(`graph-${target}`, true);
            const resultLabel = c.labels.append("div").classed(`label-${target}`, true);
            const showResultChart = function () {
                if (!state[key].started) {
                    return;
                }
                state[key].resultShown = true;
                sel.node().classList.add('shown');
                resultSection.node().classList.add('shown');
                makeGraph(resultChart, c.x(labels[target]) * 1.1, c.y(data[target]), c.x.bandwidth() / 4);
                makeLabel(resultLabel, c.x(labels[target]) * 1.1, c.y(data[target]), formatValue(data[target]));
            };
            resultSection.select('button').on('click', showResultChart);
            if (state[key].resultShown) {
                showResultChart();
            }
        });
    };

    document.addEventListener("DOMContentLoaded", drawGraphs);

    const debounce = function (func, wait, immediate) {
        let timeout;
        return function () {
            const context = this, args = arguments;
            const later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    window.addEventListener('resize', debounce(() => {
        drawGraphs();
    }, 500));

})();