/*
Highlight plugin for diva.js
Allows you to highlight regions of a page image
*/

(function ($)
{
    window.divaPlugins.push((function()
    {
        var settings = {};
        var retval =
        {
            init: function(divaSettings, divaInstance)
            {
                // initialize an empty highlights object.
                divaSettings.parentObject.data('highlights', {});

                /*
                    When a new page is loaded, this method will be called with the
                    page index for the page. This method looks at the 'highlights'
                    data object set on the diva parent element, and determines whether
                    highlights exist for that page.

                    If so, this method will create and render elements for every
                    highlighted box.

                    If a page scrolls out of the viewer, the highlight elements
                    will be removed as part of the Diva DOM pruning process, since
                    each highlight element is a child of the the page object. When the page
                    is scrolled back in to view, this method is called again.

                    @param pageIdx       The page index of the page that is to be highlighted
                    @param filename      The image filename of the page
                    @param pageSelector  The 
                */
                function _highlight(pageIdx, filename, pageSelector)
                {
                    var highlightObj = divaSettings.parentObject.data('highlights');

                    if (typeof highlightObj === 'undefined')
                        return;

                    if (highlightObj.hasOwnProperty(pageIdx))
                    {
                        var pageId = divaInstance.getInstanceId() + 'page-' + pageIdx;
                        var pageObj = document.getElementById(pageId);
                        var regions = highlightObj[pageIdx].regions;
                        var colour = highlightObj[pageIdx].colour;
                        var divClass = highlightObj[pageIdx].divClass;

                        var maxZoom = divaInstance.getMaxZoomLevel();
                        var zoomDifference;

                        if (divaSettings.inGrid)
                        {
                            var maxZoomWidth = divaInstance.getPageDimensionsAtZoomLevel(pageIdx, maxZoom).width;
                            var currentWidth = pageObj.clientWidth;
                            var widthProportion = maxZoomWidth / currentWidth;
                            zoomDifference = Math.log(widthProportion) / Math.log(2);
                        } 
                        else
                        {
                            zoomDifference = maxZoom - divaInstance.getZoomLevel();
                        }          

                        var j = regions.length;
                        while (j--)
                        {
                            var box = document.createElement('div');

                            box.style.width = _incorporate_zoom(regions[j].width, zoomDifference) + "px";
                            box.style.height = _incorporate_zoom(regions[j].height, zoomDifference) + "px";
                            box.style.top = _incorporate_zoom(regions[j].uly, zoomDifference) + "px";
                            box.style.left = _incorporate_zoom(regions[j].ulx, zoomDifference) + "px";
                            box.style.background = colour;
                            box.style.border = "1px solid #555";
                            box.style.position = "absolute";
                            box.style.zIndex = 100;
                            box.className = divClass;

                            if (typeof regions[j].divID !== 'undefined')
                            {
                                box.id = regions[j].divID;
                            }

                            pageObj.appendChild(box);
                        }
                    }
                    diva.Events.publish("HighlightCompleted");
                }

                // subscribe the highlight method to the page change notification
                diva.Events.subscribe("PageWillLoad", _highlight);

                var _incorporate_zoom = function(position, zoomDifference)
                {
                    return position / Math.pow(2, zoomDifference);
                };

                /*
                    Reset the highlights object and removes all highlights from the document.
                */
                divaInstance.resetHighlights = function()
                {
                    var inner = document.getElementById(divaSettings.ID + 'inner');
                    var highlightClass = divaSettings.ID + 'highlight';
                    var descendents = inner.getElementsByClassName(highlightClass);
                    var j = descendents.length;

                    while (j--) {
                        var parentObj = descendents[j].parentNode;
                        parentObj.removeChild(descendents[j]);
                    }

                    divaSettings.parentObject.data('highlights', {});
                };

                /*
                    Resets the highlights for a single page.
                */
                divaInstance.removeHighlightsOnPage = function(pageIdx)
                {
                    var highlightsObj = divaSettings.parentObject.data('highlights');
                    if (highlightsObj.hasOwnProperty(pageIdx))
                    {
                        var pageId = divaInstance.getInstanceId() + 'page-' + pageIdx;
                        var pageObj = document.getElementById(pageId);
                        var descendents = pageObj.getElementsByTagName('div');
                        var highlightClass = highlightsObj[pageIdx].divClass;

                        var j = descendents.length;

                        while (j--)
                        {
                            if (descendents[j].className === highlightClass)
                                pageObj.removeChild(descendents[j]);
                        }

                        delete highlightsObj[pageIdx];
                    }
                };

                /*
                    Highlights regions on multiple pages.
                    @param pageIdxs An array of page index numbers
                    @param regions  An array of regions
                    @param colour   (optional) A colour for the highlighting, specified in RGBA CSS format
                */
                divaInstance.highlightOnPages = function(pageIdxs, regions, colour, divClass)
                {
                    var j = pageIdxs.length;
                    while (j--)
                    {
                        divaInstance.highlightOnPage(pageIdxs[j], regions, colour, divClass);
                    }
                };

                /*
                    Highlights regions on a page.
                    @param pageIdx  A page index number
                    @param regions  An array of regions. Use {'width':i, 'height':i, 'ulx':i, 'uly': i, 'divID': str} for each region.
                    @param colour   (optional) A colour for the highlighting, specified in RGBA CSS format
                    @param divClass (optional) A class to identify a group of highlighted regions on a specific page by
                */
                divaInstance.highlightOnPage = function(pageIdx, regions, colour, divClass)
                {
                    if (typeof colour === 'undefined')
                    {
                        colour = 'rgba(255, 0, 0, 0.2)';
                    }

                    if (typeof divClass === 'undefined')
                    {
                        divClass = divaSettings.ID + 'highlight';
                    }
                    else
                    {
                        divClass = divaSettings.ID + 'highlight ' + divClass;
                    }

                    var maxZoom = divaInstance.getMaxZoomLevel();
                    var highlightsObj = divaSettings.parentObject.data('highlights');

                    highlightsObj[pageIdx] = {
                        'regions': regions, 'colour': colour, 'divClass': divClass
                    };

                    // Since the highlighting won't take place until the viewer is scrolled
                    // to a new page we should explicitly call the _highlight method for visible page.
                    // (only if the current page is the one to be highlighted)
                    if (divaInstance.isPageInViewport(pageIdx))
                    {
                        _highlight(pageIdx, null, null);
                    }

                    return true;
                };

                return true;
            },
            destroy: function (divaSettings, divaInstance)
            {
                divaSettings.parentObject.removeData('highlights');
            },
            pluginName: 'highlight',
            titleText: 'Highlight regions of pages'
        };
        return retval;
    })());
})(jQuery);
