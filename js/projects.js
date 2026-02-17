const username = "aleksanderjedynak";
const apiUrl = `https://api.github.com/users/${username}/repos`;

const projectsContainer = document.getElementById("projects-container");
const loader = document.getElementById("loader");
const paginationContainer = document.getElementById("pagination-container");

let currentPage = 1;
const reposPerPage = 10;

// Cache repozytoriow - nie fetchujemy ponownie przy zmianie jezyka
var cachedRepos = null;

async function fetchRepositories() {
    try {
        loader.classList.remove("hidden");
        projectsContainer.innerHTML = "";

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch repos: ${response.statusText}`);
        }
        const repos = await response.json();
        const filteredRepos = [];

        for (const repo of repos) {
            const isDeployed = await checkVercelDeployment(repo.name);
            if (isDeployed) {
                filteredRepos.push(repo);
            }
        }

        cachedRepos = filteredRepos;
        displayRepositories(filteredRepos);
    } catch (error) {
        console.error(error);
        projectsContainer.innerHTML = `
            <div class="md:col-span-2 text-center py-20">
                <i class="fa-solid fa-triangle-exclamation text-4xl text-red-400 mb-4"></i>
                <p class="text-slate-400">${I18n.t('projects.error')}</p>
            </div>`;
    } finally {
        loader.classList.add("hidden");
    }
}

async function checkVercelDeployment(projectName) {
    const deployUrl = `https://${projectName}.aleksanderone.site`;
    try {
        const response = await fetch(deployUrl, { method: "HEAD" });
        return response.ok;
    } catch (error) {
        console.error(`Deployment check failed for ${projectName}:`, error);
        return false;
    }
}

async function fetchPackageJson(repoName) {
    const packageJsonUrl = `https://raw.githubusercontent.com/${username}/${repoName}/main/package.json`;
    try {
        const response = await fetch(packageJsonUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch package.json for ${repoName}: ${response.statusText}`);
        }
        const packageJson = await response.json();
        return packageJson.version || I18n.t('projects.unknown_version');
    } catch (error) {
        console.error(error);
        return I18n.t('projects.unknown_version');
    }
}

async function displayRepositories(repos) {
    const startIndex = (currentPage - 1) * reposPerPage;
    const endIndex = startIndex + reposPerPage;
    const paginatedRepos = repos.slice(startIndex, endIndex);

    projectsContainer.innerHTML = "";

    if (paginatedRepos.length === 0) {
        projectsContainer.innerHTML = `
            <div class="md:col-span-2 text-center py-20">
                <i class="fa-solid fa-folder-open text-4xl text-slate-600 mb-4"></i>
                <p class="text-slate-400">${I18n.t('projects.empty')}</p>
            </div>`;
        return;
    }

    for (const repo of paginatedRepos) {
        const projectName = repo.name;
        const repoUrl = repo.html_url;
        const deployUrl = `https://${projectName}.aleksanderone.site`;
        const projectVersion = await fetchPackageJson(projectName);
        const projectDescription = repo.description || I18n.t('projects.no_description');

        const projectCard = `
            <div class="group bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 hover:-translate-y-1 transition-all duration-300">
                <div class="flex items-start justify-between mb-4">
                    <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <i class="fa-solid fa-code-branch text-blue-500"></i>
                    </div>
                    <span class="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded-full">v${projectVersion}</span>
                </div>
                <h3 class="text-lg font-semibold text-slate-50 mb-2 group-hover:text-blue-400 transition-colors duration-300">
                    ${projectName}
                </h3>
                <p class="text-slate-400 text-sm mb-6 line-clamp-2">${projectDescription}</p>
                <div class="flex items-center gap-4 pt-4 border-t border-slate-700">
                    <a href="${repoUrl}" target="_blank"
                       class="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors duration-300">
                        <i class="fa-brands fa-github"></i> ${I18n.t('projects.link_repo')}
                    </a>
                    <a href="${deployUrl}" target="_blank"
                       class="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors duration-300">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> ${I18n.t('projects.link_demo')}
                    </a>
                </div>
            </div>`;

        projectsContainer.innerHTML += projectCard;
    }

    setupPagination(repos);
}

function setupPagination(filteredRepos) {
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(filteredRepos.length / reposPerPage);

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement("button");
        pageButton.textContent = i;
        const baseClasses = "w-10 h-10 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer";
        const activeClasses = "bg-blue-500 text-white shadow-lg shadow-blue-500/25";
        const inactiveClasses = "bg-slate-800 text-slate-400 border border-slate-700 hover:border-blue-500/50 hover:text-white";

        pageButton.className = `${baseClasses} ${i === currentPage ? activeClasses : inactiveClasses}`;
        pageButton.addEventListener("click", () => {
            currentPage = i;
            displayRepositories(filteredRepos);
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
        paginationContainer.appendChild(pageButton);
    }
}

// Pierwsze ladowanie po inicjalizacji i18n, re-render przy zmianie jezyka
var initialLoad = true;
I18n.onReady(function () {
    if (initialLoad) {
        initialLoad = false;
        fetchRepositories();
    } else if (cachedRepos) {
        displayRepositories(cachedRepos);
    }
});
